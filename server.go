/*
 * Copyright 2019 Hayo van Loon
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
package main

import (
	"cloud.google.com/go/storage"
	"context"
	"encoding/json"
	"github.com/coreos/go-oidc"
	"log"
	"net/http"
	"os"
	"strings"
)

const storageServiceUrl = "https://storage.cloud.google.com"

type handler struct {
	tokenVerifier *oidc.IDTokenVerifier
	bucket        string
}

type ListImageLinksResponse struct {
	ImageLinks []string `json:"imageLinks"`
}

var clientId string

func (h *handler) handleListImageLinks(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	prefix := getParams(r.URL.Path)
	ls := getLinks(ctx, h.bucket, prefix)
	resp := ListImageLinksResponse{ImageLinks: ls}
	writeResponse(w, resp)
}

func getParams(path string) string {
	if len(path) == 13 {
		return ""
	} else {
		prefix := path[13:]
		if prefix == "/" {
			return ""
		} else {
			return prefix
		}
	}
}

func getLinks(ctx context.Context, bName, prefix string) []string {
	client, err := createClient(ctx)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	b := client.Bucket(bName)
	iter := b.Objects(ctx, &storage.Query{Prefix: prefix})

	ls := make([]string, 0)
	for {
		oa, err := iter.Next()
		if oa != nil {
			if isImage(oa.Name) {
				ls = append(ls, storageServiceUrl+"/"+bName+"/"+oa.Name)
			}
		}
		if err != nil {
			break
		}
	}
	return ls
}

func createClient(ctx context.Context) (*storage.Client, error) {
	// TODO: fetch credentials when not running locally
	return storage.NewClient(ctx)
}

func isImage(name string) bool {
	s := name[strings.LastIndex(name, "."):]
	l := strings.ToLower(s)
	// TODO: maybe use library
	return l == ".jpg" || l == ".png" || l == ".bmp" || l == ".svg"
}

func writeResponse(w http.ResponseWriter, resp interface{}) {
	content, err := json.Marshal(resp)
	if err != nil {
		w.WriteHeader(500)
		log.Print(err.Error())
	} else {
		w.Header().Add("Content-Type", "application/json")
		_, err = w.Write(content)
		if err != nil {
			log.Print(err.Error())
		}
	}
}

func getTokenVerifier(clientId string) (*oidc.IDTokenVerifier, error) {
	ctx := context.Background()
	authProvider, err := oidc.NewProvider(ctx, "https://accounts.google.com")
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	return authProvider.Verifier(&oidc.Config{ClientID: clientId}), nil
}

func (h *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	if h.allowAccess(ctx, r) {
		h.handleListImageLinks(ctx, w, r)
	} else {
		w.WriteHeader(403)
		_, _ = w.Write([]byte("you are not authorised for this resource"))
	}
}

func (h *handler) allowAccess(ctx context.Context, r *http.Request) bool {
	raw := getRawToken(r)
	if raw == "" {
		return false
	}
	token, err := h.tokenVerifier.Verify(ctx, raw)
	var claims struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
	}
	if err != nil {
		log.Print(err.Error())
		return false
	}
	err = token.Claims(&claims)
	if err != nil {
		log.Print(err.Error())
		return false
	}
	return claims.EmailVerified && claims.Email == "test@example.com"
}

func getRawToken(r *http.Request) string {
	if auth := r.Header.Get("Authorization"); len(auth) > 20 {
		if strings.ToLower(auth[0:7]) == "bearer " {
			return auth[7:]
		}
	}
	return ""
}

func main() {
	clientId = os.Getenv("CLIENT_ID")
	if clientId == "" {
		log.Fatal("no environment variable for client id specified")
	}

	tokenVerifier, err := getTokenVerifier(clientId)
	if err != nil {
		log.Fatal(err)
	}

	bucket := os.Getenv("IMAGE_BUCKET")
	if bucket == "" {
		log.Fatal("no environment variable for bucket specified")
	}

	http.Handle("/v1/prefixes/", &handler{tokenVerifier, bucket})
	http.Handle("/", http.FileServer(http.Dir("./files")))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

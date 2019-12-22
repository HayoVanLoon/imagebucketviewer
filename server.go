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
	"log"
	"net/http"
	"strings"
)

type ListImageLinksResponse struct {
	ImageLinks []string `json:"imageLinks"`
}

func handleListImageLinks(w http.ResponseWriter, r *http.Request) {
	bName, prefix := getParams(r.URL.Path)
	ls := getLinks(bName, prefix)
	resp := ListImageLinksResponse{ImageLinks: ls}
	writeResponse(w, resp)
}

func getParams(path string) (bName string, prefix string) {
	var xs = path[9:]
	pStart := strings.Index(xs, "/prefixes/")
	if pStart < 0 {
		bName = xs
		prefix = ""
	} else {
		bName = xs[0:pStart]
		prefix = xs[pStart+10:]
	}
	return
}

func getLinks(bName, prefix string) []string {
	ctx := context.Background()
	// TODO: fetch credentials when not running locally
	client, err := storage.NewClient(ctx)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	b := client.Bucket(bName)
	iter := b.Objects(ctx, &storage.Query{Prefix: prefix})

	ls := make([]string, 0)
	for ; ; {
		oa, err := iter.Next()
		if oa != nil {
			// TODO: extend & improve
			if strings.ToLower(oa.Name[len(oa.Name)-4:]) == ".jpg" {
				ls = append(ls, "https://storage.cloud.google.com/"+bName+"/"+oa.Name)
			}
		}
		if err != nil {
			break
		}
	}
	return ls
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

func main() {
	http.Handle("/", http.FileServer(http.Dir("./files")))
	http.HandleFunc("/buckets/", handleListImageLinks)

	log.Fatal(http.ListenAndServe(":8080", nil))
}

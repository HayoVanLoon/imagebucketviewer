# Copyright 2019 Hayo van Loon
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

MODULE_NAME := imagebucketviewer
VERSION := v1

# Docker-related
IMAGE_NAME := $(MODULE_NAME)_$(VERSION)
TAG := latest

SERVICE_NAME := $(MODULE_NAME)-$(VERSION)


.PHONY: clean check

all: clean build push-gcr deploy

check:
ifndef IMAGE_BUCKET
	$(error IMAGE_BUCKET not set)
endif

prep: check
	sed -i "s/MY_GOOGLE_CLIENT_ID/$(GOOGLE_CLIENT_ID)/g" files/index.html

unprep: check
	sed -i "s/$(GOOGLE_CLIENT_ID)/MY_GOOGLE_CLIENT_ID/g" files/index.html

git-push: unprep
	git push origin master

clean:
	go clean

run: check
	export CLIENT_ID=$(GOOGLE_CLIENT_ID) && export IMAGE_BUCKET=$(IMAGE_BUCKET) && \
	go run server.go

build:
	docker build -t $(IMAGE_NAME) .

docker-run:
	docker run \
		--network="host" \
		--mount src=$(PWD)/secrets,dst=/vol,readonly,type=bind \
		-e "GOOGLE_APPLICATION_CREDENTIALS=/vol/credentials.json" \
		-e CLIENT_ID=$(GOOGLE_CLIENT_ID) \
		-e IMAGE_BUCKET=$(IMAGE_BUCKET) \
		$(IMAGE_NAME)

push-gcr:
	docker tag $(IMAGE_NAME) gcr.io/$(GOOGLE_PROJECT_ID)/$(IMAGE_NAME):$(TAG)
	docker push gcr.io/$(GOOGLE_PROJECT_ID)/$(IMAGE_NAME)

make-service-account:
	gcloud iam service-accounts create "$(SERVICE_NAME)"

deploy:
	gcloud beta run deploy $(SERVICE_NAME) \
		--image=gcr.io/$(GOOGLE_PROJECT_ID)/$(IMAGE_NAME) \
		--region=europe-west1 \
		--memory=128Mi \
		--platform=managed \
		--allow-unauthenticated \
		--max-instances=1 \
		--service-account="$(SERVICE_NAME)@$(GOOGLE_PROJECT_ID).iam.gserviceaccount.com" \
		--set-env-vars="CLIENT_ID=$(GOOGLE_CLIENT_ID),IMAGE_BUCKET=$(IMAGE_BUCKET)"

destroy:
	gcloud iam service-accounts delete "$(SERVICE_NAME)@$(GOOGLE_PROJECT_ID).iam.gserviceaccount.com"
	gcloud run services delete $(SERVICE_NAME) \
			--region=europe-west1 \
    		--platform=managed


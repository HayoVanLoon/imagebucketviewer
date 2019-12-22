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

PROJECT_NAME := imagebucketviewer
VERSION := v1

# Docker-related
IMAGE_NAME := $(PROJECT_NAME)_$(VERSION)
TAG := latest

SERVICE_NAME := $(PROJECT_NAME)-$(VERSION)
SERVICE_USER_DISPLAY=Image Bucket Viewer


.PHONY:

all: clean build push-gcr deploy smoke-test

clean:
	go clean

build:
	docker build -t $(IMAGE_NAME) .

run:
	go run server.go

docker-run:
	docker run --network="host" $(IMAGE_NAME)

push-gcr:
	docker tag $(IMAGE_NAME) gcr.io/$(GOOGLE_PROJECT_ID)/$(IMAGE_NAME):$(TAG)
	docker push gcr.io/$(GOOGLE_PROJECT_ID)/$(IMAGE_NAME)

deploy:
	gcloud iam service-accounts create $(SERVICE_NAME) \
		--description="$(SERVICE_USER_DESCRIPTION)" \
		--display-name "$(SERVICE_USER_DISPLAY)"
	gcloud beta run deploy $(SERVICE_NAME) --image=gcr.io/$(GOOGLE_PROJECT_ID)/$(IMAGE_NAME) \
		--region=europe-west1 \
		--memory=128Mi \
		--platform=managed \
		--no-allow-unauthenticated \
		--service-account="$(SERVICE_NAME)@$(GOOGLE_PROJECT_ID).iam.gserviceaccount.com"

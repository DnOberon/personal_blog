---
date: "2020-4-10"
tags: ["cli", "golang", "aws", "discord", "github"]
title: "Go Discord Bot with Github Actions and ECS"
draft: "false"
summary: "Learn how to build a Discord bot in Go and deploy it using Github Actions and ECS"
---

This post is a crash course in creating a deploying a Discord bot using Go, AWS's ECS platform, and Github actions. This post was inspired by my work on [stalk-bot](https://stalk-bot.com), a Discord bot for quickly sharing turnip prices in Animal Crossing: New Horizons. 

We're going to move fast, I won't be explaining what ECS and ECR are, only linking out to the documentation. You're welcome to email me or contribute to this page on Github if you want any further clarification or if you feel we're lacking critical information.

<br>
## The Bot
We're not going to do anything fancy for the bot, in fact, we're going to go ahead and use one of the example bots from the [discordgo](https://github.com/bwmarrin/discordgo) project itself. DiscordGo is a go package that provides low-level bindings for Discord. 

Here is their sample bot, "pingpong" - it will respond to "ping" with "Pong!" and "pong" with "Ping!".

```
package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/bwmarrin/discordgo"
)

func main() {

	// Create a new Discord session using the provided bot token.
	dg, err := discordgo.New("Bot " + os.Getenv("DISCORD_TOKEN))
	if err != nil {
		fmt.Println("error creating Discord session,", err)
		return
	}

	// Register the messageCreate func as a callback for MessageCreate events.
	dg.AddHandler(messageCreate)

	// Open a websocket connection to Discord and begin listening.
	err = dg.Open()
	if err != nil {
		fmt.Println("error opening connection,", err)
		return
	}

	// Wait here until CTRL-C or other term signal is received.
	fmt.Println("Bot is now running.  Press CTRL-C to exit.")
	sc := make(chan os.Signal, 1)
	signal.Notify(sc, syscall.SIGINT, syscall.SIGTERM, os.Interrupt, os.Kill)
	<-sc

	// Cleanly close down the Discord session.
	dg.Close()
}

// This function will be called (due to AddHandler above) every time a new
// message is created on any channel that the autenticated bot has access to.
func messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {

	// Ignore all messages created by the bot itself
	// This isn't required in this specific example but it's a good practice.
	if m.Author.ID == s.State.User.ID {
		return
	}
	// If the message is "ping" reply with "Pong!"
	if m.Content == "ping" {
		s.ChannelMessageSend(m.ChannelID, "Pong!")
	}

	// If the message is "pong" reply with "Ping!"
	if m.Content == "pong" {
		s.ChannelMessageSend(m.ChannelID, "Ping!")
	}
}
```

<br>
## Dockerfile
In order to use ECS and deploy our bot, we must create a Docker image for it. Here is a no frills Dockerfile for creating our image and running our program inside of a container.

```
FROM golang:1.13.0-stretch AS builder

ENV GO111MODULE=on \
    CGO_ENABLED=1

WORKDIR /build

# Let's cache modules retrieval - those don't change so often
COPY go.mod .
COPY go.sum .
RUN go mod download

# Copy the code necessary to build the application
# You may want to change this to copy only what you actually need.
COPY . .

# Build the application
RUN go build .

# Let's create a /dist folder containing just the files necessary for runtime.
# Later, it will be copied as the / (root) of the output image.
WORKDIR /dist
RUN cp /build/stalk-bot-discord  ./stalk-bot-discord

CMD ["/dist/stalk-bot-discord"]
```

<br>
## Push Docker Image to [ECR](https://aws.amazon.com/ecr/)
This next step you should only have to do once (that is IF you wish to use ECR with your ECS deployment, I highly recommend it). In order to correctly configure ECS you must be able to provide it with an initial Docker image. 

The absolute easiest way to do this would be to follow AWS's guide on [creating a repository in ECR](https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-create.html) and then [pushing the Docker image](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html) we created above. I recommend having the [Amazon ECR Credential Helper](https://github.com/awslabs/amazon-ecr-credential-helper#Configuration) installed for this bit.  

<br>
## Configure [ECS](https://aws.amazon.com/ecs/)
We are going to need to create a Task Definition, a Cluster, and a Service inside that cluster.

**1. Task Definition**

Follow the tutorial [Creating a Task Definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-task-definition.html). Keep everything to their defaults except the Launch Type Compatibility - choose EC2, it will allow us to take advantage of AWS's free tier when creating and using our cluster 

**2. Cluster**

Follow the tutorial [Creating a Cluster](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create_cluster.html). Choose the EC2 Linux + Networking template type. You can keep everything at its default value on this page BUT I highly recommend you change the EC2 Instance type to something you're willing to pay for. In this case we choose a `t3.micro` so that we could take advantage of AWS's free tier.

**3. Service**

Follow the tutorial [Creating a Service](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service.html). Choose the EC2 launch type and select the task definition you created above. DO NOT CREATE MORE THAN ONE TASK. This will run multiple instances of your bot to bad effect (Discord has a way around that using [sharding](https://dsharpplus.emzi0767.com/articles/sharding.html)). Chances are you won't need to run multiple instances of your Discord bot for a good long time, so don't worry. Everything else leave on their default.



<br>
## Github Action configuration
Now that you've got everything created, we can use Github Actions to automate the deployment of our bot. Luckily there is an AWS created and maintained action called [Deploy to ECS](https://github.com/actions/starter-workflows/blob/master/ci/aws.yml). The best part is that this action contains detailed instructions on how to successfully use it. I'll go ahead and post the instruction bit here so you can have it in one place. A full example can be found [here](https://github.com/DnOberon/stalk-bot-discord/blob/master/.github/workflows/aws.yml)

```
# This workflow will build and push a new container image to Amazon ECR,
# and then will deploy a new task definition to Amazon ECS, when a release is created
#
# To use this workflow, you will need to complete the following set-up steps:
#
# 1. Create an ECR repository to store your images.
#    For example: `aws ecr create-repository --repository-name my-ecr-repo --region us-east-2`.
#    Replace the value of `ECR_REPOSITORY` in the workflow below with your repository's name.
#    Replace the value of `aws-region` in the workflow below with your repository's region.
#
# 2. Create an ECS task definition, an ECS cluster, and an ECS service.
#    For example, follow the Getting Started guide on the ECS console:
#      https://us-east-2.console.aws.amazon.com/ecs/home?region=us-east-2#/firstRun
#    Replace the values for `service` and `cluster` in the workflow below with your service and cluster names.
#
# 3. Store your ECS task definition as a JSON file in your repository.
#    The format should follow the output of `aws ecs register-task-definition --generate-cli-skeleton`.
#    Replace the value of `task-definition` in the workflow below with your JSON file's name.
#    Replace the value of `container-name` in the workflow below with the name of the container
#    in the `containerDefinitions` section of the task definition.
#
# 4. Store an IAM user access key in GitHub Actions secrets named `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
#    See the documentation for each action used below for the recommended IAM policies for this IAM user,
#    and best practices on handling the access key credentials.
```

### Environment Variables
A problem I ran into is that each time I would update the ECS container my environment variables for the task definition would be completely wiped out. This is a problem. I solved it by storing my environment variables in Github's secret manager and using the shortcodes for filling the secrets in on the action run. See [here](https://github.com/DnOberon/stalk-bot-discord/blob/master/.github/workflows/aws.yml#L74)

## Conclusion
Hopefully this crash course is helpful to you. This is a super easy, nearly free way of running a Discord bot. 
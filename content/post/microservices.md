---
date: "2023-04-15"
tags: ["development", "advice", "microservices"]
title: "Should We Do Microservices?"
draft: "false"
summary: "A reply to a colleague concerning the adoption of microservices in our workplace."
---

*I started writing a Microsoft Teams reply to a colleague with whom I'd discussed the adoption of microservices. Before I knew it, I was 3 paragraphs deep and thought others might benefit from my thoughts and what I posited as reasons for hesitance in our pursuit of microservice architecture. I've edited this a bit and I hope I didn't sound as pretentious in the Teams message as I sometimes tend to in my longer writing.* 

*Names have been changed to protect the innocent*

Sam,

I've been thinking a lot the last few weeks about the recent conversations we had regarding microservice architecture. I wanted to get these thoughts out onto paper for you because I think we need to continue our discussion in more depth.

You see, this isn't my first rodeo. Around 2016 I was hired on to an international ecommerce company as a software engineer. It was a period of explosive growth for the development team and they'd recently decided to not only switch languages (from PHP to Go) but were now in the process of exploring and adopting a "microservice" architecture. I worked for them in some capacity for a few years - enough time to see them go through the entire adoption lifecycle - from the initial repository with "microservices" in the description, to a mature and arguably stable ecosystem of services, support, and data management. This experience has served to temper my expectations of microservice's benefits and has helped flesh out the common sales brochure that comes along with anyone discussing the benefits of switching. I hope that I can share a little of what I've learned and highlight the particular difficulties that we're going to face in our particular situation, as guided by experience and previous work in this environment. 

First, let's cover some of what the sales brochure for microservices promises us:
* **Program language agnosticism:** The ability to have services written in the language that makes the most sense for the problem and the developers writing them
* **Fast development cycles and time to market:** Bite size and domain bounded services means we can more quickly get services off the ground for our customers
* **Team topology mirroring and optimization:** In an environment where we have many different projects and teams, having our code architecture mirror our topology can benefit us by allowing us to move quicker and independently
* **Deployment simplification and independent scaling:** Reusable and easier deployments for smaller services vs. large management tactics on bigger codebases and infrastructures

There are more than I've listed, but I think these are the big ones that have been most attractive to our teams as we've considered a microservices architecture. These are also the reasons I wanted to dive into in more detail, because I believe there are some serious obstacles to overcome in each. 

## Program Language Agnosticism
In theory this sounds fantastic. Write the services in languages the make the most sense for the domain and that the developers are most comfortable using. People will be happy because they're doing something they enjoy, the work gets done, and you're left with happy developers and sustainable code. 

In reality, giving free rein to each service's team to pick their own language and tooling is a recipe for eventual disaster. What we tend to forget is that anything we write and put into production **must be maintained** until its retired. If you have four different teams writing in four different languages then you've just increased the onboarding barriers fourfold for any new developer coming into already created systems. What happens when you eventually experience turnover? With developers typically not staying on for multiples of ten years it means they will eventually leave all their code in their favorite language behind for others to maintain. And heaven help you if your teams ever shrink and four becomes two - because now you're suddenly maintaining four separate languages along with all their tooling. While attractive at first, this level of freedom is rarely sustainable in most companies. 

Unless you are Google, Facebook, or another tech giant whose ecosystem is constantly growing - it's a much better idea to consolidate your languages and tooling when at all possible. This means that sometimes you might not be working with the best language for the domain, or in the most developer ergonomic one - but these tradeoffs are worth having a stable environment, a cross-trained team, and a sustainable ecosystem for long term development. If we adopt a microservices pattern we need to be strict with what languages are used across the department - and avoid introducing new complexity when we don't have to.

## Fast Development Cycles and Time to Market:
My previous company fell into a trap common in microservice adoption. They decided that "microservice" really did mean micro in size, and so adopted the pattern that new HTTP services should only consist of only a few endpoints. This would help cut down complexity, allow for quicker production, and mean they could deliver incrementally at high speeds. While true that cutting things into smaller chunks means you can deliver those chunks faster, this set of truly "micro" services were eventually looked upon with loathing and dread when anyone had to work on them. 

With such small services you inevitably share the same domain as other small services. You might have five or six different services all dealing with some aspect of the payment system or sales commissions. You might need to have one service call another simply to achieve its primary function.

Typically, in microservices you want true isolation between services - this includes the database and data structures. With such small services sharing domains such separation - if maintained - becomes nightmarishly difficult to navigate. More often we saw the contractors working on these services start sharing databases and data structures between services. They would sidecar domain models between multiple services, tightly coupling what was supposed to be independently managed entities and making it impossible for a developer to modify only a single service at a time. Eventually a simple feature request might involve touching many of these small services to deliver.

We can't equate speed with size when it comes to development. Adopting microservices doesn't mean that our size of produced work is actually micro in size. In reality, fast development cycles and time to market is achieved not by creating smaller chunks but by getting your domain separations right the first time and ensuring that feature development doesn't require touching multiple services.

## Team Topology Mirroring and Optimization
One of the reasons microservices is so attractive to us right now is due to the highly fractal nature of our teams and projects. We have many developers split across various projects and giving them the freedom to do exactly what they need for their customer and deliver faster (see above) is extremely attractive. We hope that by adopting a sharded architecture, with services spread across teams, we can emulate our **current** team topology in code and "go with the flow", so to speak. 

There are a couple of dangerous assumptions here that need to be addressed.

**First**, we assume that our teams will always be this way and at least this size. With such a rapidly growing department we can't easily foresee what our developer spread will look like six months from now. We could grow, or shrink in size - and the spread of skill might skew between developer and devops (just as an example). If we adopt this architecture, we would do well to ensure that our actual code and infrastructure mirrors more closely our domains than our teams while at the same time making sure that what we develop could be maintained by a skeleton crew if necessary. My previous position saw a large shake-up when the four most experienced developers, all working in mostly separate areas, decided to leave the company all within about a year of each other. We tried to push to hire more people, and higher skilled individuals, but were not successful and were left with a wide swath of services to maintain for a very small operational team. I can't help but think a lot could have been avoided with better domain knowledge at the time of certain services inception or with thoughts to long-term maintenance by a crew smaller than ours.

**Second**, I often see that teams assume their customer's needs are unique to the group. In truth, there is so much potential for shared processes between various customers and consumers that we often overlook. When we fracture our teams and architecture we must be very careful not to also fracture the shared domains that might exist between them. We should be very careful that as we create these new services that each reflect the domains we hope to work in accurately, and that what we create serves as many customers as possible. 

## Deployment Simplification and Independent Scaling
One of my favorite features of Go, and one of the reasons the team switched, is its capability to produce a single binary on compilation. There wasn't a need to install a runtime, various dependency files, or a specific file hierarchy to work. This helped simplify deployments significantly - and with our adoption of Rust in the department we are seeing some of the same benefits. The reasoning with microservices here is that if each of our services is smaller, completely encapsulated, and perhaps as small as a simple, single binary then it means our deployments to our infrastructure should be just as easy.

I wish that was the case. 

Too often we think of a single microservice's deployment instead of the entire ecosystem. When you adopt microservices, you must also adopt some form of service orchestration. You might need a separate discovery service just to make sure that users of your API ecosystem get routed to the correct service. You must now handle service to service authentication (and we can't just solve this by simply making sure their on a private network). You'll need to figure out logging and debugging of your microservice ecosystem. In other words, there's a whole world of support structure that you must now build, use, and maintain around your simple deployments. 

We also face a not so unique problem in our department - in that anything we develop must also be able to run in an on-premises environment and potentially without outside network access. This means that we will not be able to simply marry ourselves to Azure or AWS's microservice support ecosystem and live there forever. We have to find open-source and own deployable solutions that we then must have the manpower to continually support.

## Conclusion and Other Thoughts
There are some other problems I saw at my last microservice migration that we need to figure out how to solve that didn't fit nicely in the topics above. Some of these are specific to our actual circumstances, and some more general.

* **Versioning**: We ran into issues with trying to version microservices. How do you control the fact that v1.0 of service A contains an endpoint that v1.0 service B relies on, but 1.1 of Service A no longer has that endpoint? You have to plan how to manage API contracts and versioning between services - and then practice strict discipline when in production in order to achieve no breakage and to avoid touching five services to deliver a single feature.
* **Security**: Dealing with sensitive data that could result in more than just loss of public esteem if leaked means our services that contain data must practice the strictest security. Do we have the team and experience to apply security best practices in microservice adoptions?
* **Ease of Use**: We want to make our tools easy for others to use and manage in their own data centers. We also try to open source everything. What happens if we adopt an extremely difficult to initially configure architecture? We have to maintain ease of adoption and use throughout our work in this realm.

So, should we adopt microservices? I'm not entirely sure yet. I think we could gain a lot of benefits from adopting microservices, but we also inherit a lot of risk. Apart from just choosing the tech stack to pull this off, we'll need to also figure out how we'll overcome the obstacles I've listed here and identify others that might yet stand between us and success. Whatever we choose to do though, I know that we are surrounded by intelligent and skilled individuals and we'll be able to pull off whatever we set our minds to.
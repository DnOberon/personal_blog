---
date: "2025-03-01"
tags: ["development", "advice", "project-management"]
title: "Leaving INL and DeepLynx"
draft: "false"
summary: "After six years I will be leaving the Idaho National Laboratory and moving on. I reflect a bit on my time there, particularly on the open-source project DeepLynx"
---

This week I announced my resignation from my current position as Software Architect at the Idaho National Laboratory. The major factor in my decision to leave INL,  was that they recently decided \- without any clear direction from the Department of Energy \- to announce a [return to office (RTO) mandate](https://www.eastidahonews.com/2025/02/inl-directs-all-6400-employees-to-return-to-work-on-site/).

I was debating on making this entire blog post about my opinion on RTO (hint: it isn’t favorable), or the various studies and anecdotes as to the effectiveness of remote work, or berating INL for a decision which will cost a good amount of very good, very effective people their jobs \- but after thought (and thinking I might get sued) I’ve decided to use this time to reflect on a certain piece of my work while at the lab and the direction I hope it takes now

I’m talking about [DeepLynx](https://github.com/idaholab/Deep-Lynx/).

## Fighting Feelings

It’s still hard for me to post public links to what I’ve worked on at least part-time for the last 6 years. I think that’s because there is a lot of history in this repository \- a lot of mistakes, learning moments, and just pure hare-brained schemes. It took me 4 of those years to come to the conclusion, with the help of a fantastic therapist, that I don’t need to tie my worth to a program I wrote and that I had every right to be able to feel disappointed in my work. It’s with all these feelings that I finally post the links to that repository here on my personal blog.

I forever own the code and regret I wrote \- **but** I also own all the learning, progress, and hard work that’s represented by this repository. I can say it is not my proudest work \- but it is mine, and I am who I am today because of my experience with it.

So let's explore it.


## The Early Days

I started my work with INL as a subcontractor working under the now very famous (at least in the DOE) [Chris Ritter](https://www.linkedin.com/in/christopher-ritter-198a9522/) . I started on a large construction project, and while I can’t give you too many details I *can* talk about some of the interesting technology and problems I had to solve while working on that.

### Aveva Everything3D and .NET Hell

My very first tasks had to do with ripping the guts out of Aveva Everything3D stored projects by attempting to dump their database into a transferable form. Here’s the catch though \- their database is a home-built (in either late FORTRAN or COBOL I can’t remember) hierarchical system that I cannot read directly called [DABACON](https://docs.aveva.com/bundle/engineering/page/871698.html). Instead, I have to use a horribly outdated .NET SDK wrapper *over* what basically consists of a hidden terminal to their backend service.

We also wanted a more intermediate format for the items in a given project \- so I was tasked with outputting .IFC formatted files \- again using that hidden terminal. This wasn’t a CPU friendly task however \- and they wanted this dump frequently \- so I was faced with how to maintain an up-to-date registry of .IFC files without swamping the resources. I settled eventually on a polling system that would, after an initial pull and creation of .IFC files, only regenerate those that had changed directly. This was easier said than done due to how DABACON stored its timestamps, and the limited query capability I had. I ended up writing some interesting recursive walker functions to constantly crawl the DABACON db and keep track of the timestamps.

Once we generated those files we realized we needed a place to put them. We started looking around \- but both my current boss at the time  and I were of the mind that we didn’t have an exact tool out there that fit our needs for how this storage layer would work and look.

### The First Attempt

[DeepLynx](https://github.com/idaholab/Deep-Lynx/) needed to store highly relational data under an ontology (a fancy way of saying how things are named and related \- there’s more obviously but the gist helps you get going). This ontology was unknown until run-time and provided by the user. Subsequently, data stored using this ontology would have an unknown structure at runtime as well as relationship possibilities unknown at database schema creation time.

I feel like we pretty naturally gravitated to a graph storage system. The flexibility in schema and relationships felt like a good fit for dynamically creating and storing data under a user defined relationship map.

We couldn’t use Neo4J \- probably the most popular graph database for scientific work at the time, and still might be \- due to high licensing costs and our desire to release this solution under an open-source license. I played around with various graph storage technologies \- but kept getting stuck on query languages (SPARQL, CYPHER, Gremlin) that felt far more rickety to use than SQL, and which often lacked good software libraries to make working with the underlying technologies easier.

We ended up setting a CosmosDB instance and used their graph database functionality, which was Gremlin compatible. However, not only was Azure’s SDK’s somewhat out of date with CosmosDB at the time, their Gremlin support was two(?) major versions behind what was published for Gremlin.

What was interesting is that their Gremlin protocol received requests in the latest version \- but *responded* in outdated versions. I wrote some custom GremlinJSON support to handle this, but eventually decided that this wouldn’t be a good use of time. Not to mention, Gremlin supported database engines didn’t have a clear open-source offering (that I could find).

### Long Live Postgres

We settled on doing a custom schema in Postgres. This open-source juggernaut has multiple plugins that could make our lives easier \- as well as offerings on all the major cloud providers. It fits well with capability and availability and, at least at the time, covered all our use cases (albeit with custom work required).

While not a complex schema we did do some interesting work. Even with its performance issues over a certain number of records, our Postgres implementation was effective. We offered a graph database with full recursive SQL searching and with time-travel \- letting you query your graph at any point in time.  We made this available via a GraphQL API \- and while I don’t think it ended up being the right choice, that GraphQL dynamic schema creation was some of the most brutal code I’ve written and gave me some pride when it worked effectively.

Thankfully, there are a lot of newer capabilities in Postgres out there that makes dealing with graphs so much easier. You’ve got things like AgensGraph \- and just recently a post on using pgrouting to navigate a graph. There’s a lot of capability that simply didn’t exist in a form stable enough for us to use when we first designed the schema.

I wasn’t a Postgres at scale expert at the time \- and while I’m still no expert, I’ve learned a lot in that realm due to this project. I’m of the mind now that unless you’ve got a highly transactional system and access to that data is required constantly, then avoid a petabyte scale Postgres cluster at any cost. Yes, cloud services have offerings that offer clustering out of the box, but you’re going to pay extra for that, and it’s no silver bullet.

Schema migrations, major version upgrades, and security concerns all still give me nightmares sometimes. While that’s not to say this isn’t the appropriate solution to problems, it wasn’t the appropriate solution to *our* problem. We could have used a central Postgres server for our operational schema, and maybe the current snapshot of the data. I would much rather have adopted a LakeHouse strategy and try writing the historical data out to Delta Tables or Iceberg for long-term storage, but still queryable if needed.

### Regrets

I have a lot of regrets about [DeepLynx](https://github.com/idaholab/Deep-Lynx/) and haven’t ever really listed them until now.

* **Incorrect Technology Stack**: I like to think I didn’t have enough clout at the time we made the initial tech choice, that I didn’t want to go along with it, but the truth is probably somewhere more in the middle. My boss argued for Node.js \- wanting to unify the front-end and backend (where have we heard that before) \- and I didn’t have any ammunition to change that decision. I had just come off doing Go for a few years, and was a little burned out by it. I think if I could travel back in time \- I would have pushed harder for the .NET/.NET Core choice.
* **Heavy use of [Enterprise Architecture](https://martinfowler.com/eaaCatalog/)**: I felt like I was laying groundwork for a ton of other developers, and was promised we’d soon have a big team working on this. So I designed the codebase following some very popular patterns out of Fowler’s book \- thinking that if I did that I could more easily introduce and control contributions to the project. Why I decided to throw out all the empirical evidence of the previous 4 years of my programming career \- evidence screaming that this would be bad \- I did it anyway. I strongly value simplicity in architecture nowadays because of this \- preferring to find technologies and libraries that allow our project’s code to act more like glue \- and less like some Byzantine puzzle machine.
* **Lack of *Developer* documentation**: While I made sure the code level comments were extensive \- I didn’t do a great job of explaining technology choices, the *why* behind a certain interface/application, or how I perceived a certain module or functionality to fit within the greater application. There was a lot about the future state of the project that I never got out into writing, which would have been beneficial in making sure all developers were on the same page.
* **I accepted being a [BDFL](https://en.wikipedia.org/wiki/Benevolent_dictator_for_life)**: When we started to get new developers on the team, and when other projects used the application I would often monopolize the new development as well as interactions with those teams. It would have been better to empower and enable these people to work on the project themselves (through the points above) instead of saying “I’ll do it myself”. Pride cometh before the fall.
* **Never clarified or defended a clarified goal**: [DeepLynx](https://github.com/idaholab/Deep-Lynx/) 1.x suffers from the classic “be-everything” machine. For each project that needed something new we started seeing how we could incorporate this into [DeepLynx](https://github.com/idaholab/Deep-Lynx/) vs. using existing tools/libraries. There are many buried feature skeletons, as well features that never reached their full potential due to lack of focus.
* **Oversold its capabilities**: Especially early on I was too caught up in my programming capabilities to have controlled the extent at which [DeepLynx](https://github.com/idaholab/Deep-Lynx/)’s features list grew. I remember giving presentations and meetings in which I promised certain features and aspects \- only to never finish them. I know this can be common in software development and sales \- but it never sat well with me. I’m an honest person \- and misrepresenting [DeepLynx](https://github.com/idaholab/Deep-Lynx/) became a constant sore point with me and others. I try to maintain a positive outlook \- while never looking away from its warts.
* **Letting go**: While in my last two years of INL I was working on a project that required a larger amount of my time than usual. I used that as an excuse to get away from working on [DeepLynx](https://github.com/idaholab/Deep-Lynx/) \- and while I still offered occasional features (I tried to always offer help) I stayed out of its way too much. I abandoned the project at a crucial juncture, and just when we were getting a new junior team together. Because of that abandonment, [DeepLynx](https://github.com/idaholab/Deep-Lynx/)’s code base was left to fester and the application itself became something no one enjoyed working on. I have constantly underestimated how a single person’s enthusiasm and belief in a product can cause it to succeed \- and how the lack of it can just as swiftly lead to failure and pain.

## The Future

At the start of this year I handed over the intellectual rights to a web application called Datum to INL. This was the start of a data catalog that I’d been working on in the Elixir/Erlang stack and something I was growing very proud of. I felt like it could be a boon to our work, even just as an experiment.

While it started out as a catalog, Datum swiftly became the choice to replace [DeepLynx](https://github.com/idaholab/Deep-Lynx/). We decided to keep the [DeepLynx](https://github.com/idaholab/Deep-Lynx/) name however, and simply began calling this [DeepLynx](https://github.com/idaholab/Deep-Lynx/) 2.0. We even announced it at StratDEC this year.

It wasn’t to be, however, since at the same conference (after the presentation) we learned the news of INL’s RTO mandate. Unfortunately Datum, in its current form, will probably never see the light of day \- and that’s ok with me.

I suggested, and it seems to have been followed, that without a senior engineer in that language and stack, that they shouldn’t attempt to deliver a production level application in the timeframe needed. While I suggested hiring \- I used this moment as an opportunity to evaluate whether the Elixir/Erlang stack would continue to be a good fit, and settled on no. I  made my suggestion and trusted that I could use the last of my goodwill at the company to steer them out of a potential minefield.

Last I heard, they were investigating C\# and .NET \- libraries and languages which INL has great internal support and which are widely adopted and used within the DOE.And they were investigating using various LakeHouse technologies that I’d PoCed in the past or suggested to them. So honestly, that makes me feel pretty good.

[DeepLynx](https://github.com/idaholab/Deep-Lynx/) is now officially no longer part of my job responsibilities. Something I committed to at least every month for the last 6 years is now out of my hands. I’m partly proud and partly regretful of the work I did.

I keep telling myself however, that if I didn’t regret something it would have meant that I hadn’t learned anything.

## To The New Team

Congratulations on being part of a project and a team that I really feel can make a difference in the world of digital engineering. You’re inheriting a problem-space rich with potential for unique solutions and personal reward.

I want to wish you luck as you build the next generation of [DeepLynx](https://github.com/idaholab/Deep-Lynx/). I hope that you can learn from all my mistakes in the first one, and that you’re able to use the success I found as a foundation for your own.

Please be kind to those who came before, yourself, and any future teammate on this project. 

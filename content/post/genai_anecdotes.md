---
date: "2025-05-23"
tags: ["development", "genai", "copilot"]
title: "Some Personal Anecdotes About Developing with GenAI"
draft: "false"
summary: "These are a collection of my _personal_ experiences with GenAI and the people who use them in various settings. Draw whatever conclusion you want from this article - but please, use your own mind to arrive at said conclusion - don't let GenAI summarize and synthesize it for you."
---
These are a collection of my _personal_ experiences with GenAI and the people who use them in various settings. Draw whatever conclusion you want from this article - but please, use your own mind to arrive at said conclusion - don't let GenAI summarize and synthesize it for you.

### For Loop

While pairing with another programmer, we decided to refactor a simple javascript `for...of` loop in order to include an index. Because we were not mutating the element, we could have easily done either a more traditional `for (let i = 0;....` or could have used `for [index, entry] of items.entries()` - either solution would have worked fine.

Neither of us were that familiar with javascript (rusty systems programmers) so we each decided to validate our solution idea different ways. I went straight to language documentation and found the aforementioned methods. My colleague however, asked CoPilot.

CoPilot decided that we wanted to rewrite this using `for...in` and did some weird, incorrect version of pulling the index. This becomes even worse when you learn that `for...in` *doesn't guarantee order* as it iterates arbitrarily. My partner was skilled enough to realize it didn't look right - but instead of going to documentation, he choose to try and redo the prompt to correct the output.

It seems like it's now the default to give these models unlimited chances to get something right and then promptly forget how much effort it took to get a correct answer out of it when faced with the next problem.  I have no idea what model he was using - and honestly it doesn't matter as I've observed this pattern of behavior when users were interacting with ChatGPT, Cursor etc.

Please note, I don't consider the other developer a poor engineer - but I'm seeing more and more of this kind of behavior when writing code/debugging and it's frustrating. While I found a correct answer in < 2 minutes of searching documentation, my partner was going on 6-7 minutes before I pulled the plug and suggested we move on.


### Argo Workflows

I was helping a coworker debug a set of Argo workflows, again neither of us being particularly skilled in it. In this DAG style workflow, we had a step which generated `n` entries, each of which needed to be processed separately by two separate steps. We got the first set of steps functioning properly using a `withParam` option. This was great, and technically would work on the second step as well - but we needed that second step to wait for the first step to finish successfully.

We had been using something like `depends: task.Succeeded` before - but knew this wouldn't work anymore, because we had `n` number of tasks and needed to wait until each had succeeded.  Again, in a pattern that's becoming frustratingly familiar, I went to the documentation site and the other engineer asked CoPilot.

CoPilot gave us an answer that looked somewhat like `task.*.Succeeded` - which looked like it _might_ work as it gave the impression it was a catch-all. I'm still unsure if this was how it used to be accomplished or what - either way it failed miserably. The crappy part is that before the engineer could know it had failed it took roughly 15 minutes to run the whole pipeline to deploy it, trigger the processes etc. So he didn't know for 15 minutes that the answer CoPilot gave him was incorrect. Not only that, but the error message that came back wasn't directly related to that part (it seemed) so its very possible that if he had included other changes in the deployment, he could have missed the real problem.

On the other hand, through the official documentation, I learned that we could simply nest another DAG style template within the main DAG. While I don't know if it is best practice, it did give us the exact response we needed _and_ allowed us to setup exit handlers for individually failing items in that workflow.

CoPilot was only attempting to solve the problem given to it - it didn't, couldn't maybe, give us a novel solution which required a different approach than what we were trying. It was content to let us hammer away in the wrong direction because it's not actually AI, it's a probability engine.


### Can we please read the error message?

While helping someone debug a python script we started encountering a persistent error in execution. Often when you're pairing with more inexperienced engineers it is better to help guide them to actions to get the solution vs. giving it to them wholesale.

In this case the logs had the problem fairly clearly outlined in them - like `something.py failed on line 41, module aws not found`. It was a very standard Python error about a missing import, and a cursory examination of the log would have revealed it.

The junior got the part with the logs, scrolled for a second and then said "I know, let me paste this to ChatGPT and see what it says." While in this case the model successfully found the issue in the logs, it didn't do much to highlight how it came to that conclusion - I'm assuming due to some "give only the answer" prompt shenanigan.

The junior made the change and moved on - only to have the script promptly fail yet again with another module missing error. **AGAIN** the junior fed the log into ChatGPT and I had to mute myself to stop the sound of my head hitting my desk from echoing through the meeting.  It was fairly obvious he hadn't learned anything at all and was very content to just let ChatGPT continually spoon-feed him what he'd proudly add on his resume as "successfully debugged proprietary software" or something.

My personal opinion is that coding agents do very little, if anything, to encourage learning and understanding of how to accomplish software engineering tasks. This leads me into just a general anecdote...

### Ready, set, read the f%$king manual!

I can't count how many times I've started debugging with other engineers, encounter an issue, and see them immediately reach for their agent. Most don't know where they'd find documentation for their programming language or for the libraries they use daily.

When did the default option become copy-pasting into an agent vs. looking at library documentation, or *gasp* the source code for the project? I feel like I'm taking crazy pills every time I find an answer in the source or documentation - only to have it less trusted than what a model trained on stolen data spat out.


### CoPilot, take the wheel!

While I don't agree with it, I've worked under an organization that required an extremely high % of code be covered with unit tests. While I agree testing is great, this particular requirement was asinine and did little to improve the quality of the code being produced. We needed to focus on integration and smoke testing - but seemed to be stuck with a "unit test all the things" mentality.

When I confronted a coworker about this insane requirement and how best to open conversations about correcting this belief and pushing for some more realistic and helpful options, they said -

> **Oh I don't worry about it, just have CoPilot write all your tests for you and they'll accept it**

GenAI does great at helping us reduce the time it takes to complete rote tasks its true, but it seems like its also training us to take the path of least resistance. Instead of building a chorus of voices to help the organization find a better way of producing quality code, we chose to exacerbate the problem by producing even more throwaway code.


I plan on adding to these anecdotes as time passes. Hopefully I can inject some sanity into the seemingly grifter driven "AI WILL SOLVE ALL THE ENGINEERING" that seems so prevalent nowadays.


*This article was written without any help from AI and used only common spell-checking tools*
---
date: "2025-07-29"
tags: ["development", "erlang", "beam", "python"]
title: "A New Project - Re:BEAM"
draft: "false"
summary: "A method for running Python modules under supervision trees and using the actor methodology."
---

# A New Project - Re:BEAM 

## A method for running Python modules under supervision trees and using the actor methodology.

So we’re clear, I don’t have much code-in-repository yet. This is primarily a method to keep me motivated and to judge if anyone else might be interested or excited about something like this. If this *is* interesting to you I encourage you either @ me somewhere on GitHub ([https://github.com/DnOberon](https://github.com/DnOberon)) or become a part of the discussion on the repository itself ([https://github.com/DnOberon/rebeam/discussions](https://github.com/DnOberon/rebeam/discussions)).

## Intro

If you know me at all, you know that I typically loathe Python. This article isn’t meant to lay out all the reasons why \- so if we ever meet in person and you want to see me jump up on a soapbox faster than a man of my stature is physically capable, ask me why I dislike it. 

However, much I dislike Python, I accept that it is a widely used and popular language \- and that’s probably not going to change anytime soon. In fact, in my current position I use Python almost exclusively and haven’t burst into flames. But here’s the thing \- I miss Erlang and Elixir. 

I miss the languages themselves, sure,  but mostly I miss the [BEAM](https://en.wikipedia.org/wiki/BEAM_\(Erlang_virtual_machine\)) and the [OTP](https://www.erlang.org/doc/system/design_principles.html) principals. 

There was an article recently \- [We Tested 7 Languages Under Extreme Load and Only One Didn't Crash (It Wasn't What We Expected)](https://freedium.cfd/https://medium.com/@codeperfect/we-tested-7-languages-under-extreme-load-and-only-one-didnt-crash-it-wasn-t-what-we-expected-67f84c79dc34) \- in which the BEAM VM shone bright under extreme load and extreme circumstances. I miss that. I miss supervision trees, process registries, process isolation, message passing (and actors in general). I miss the networking (well, some bits) and [ETS](https://www.erlang.org/doc/apps/stdlib/ets.html). Though I never used it, hot module reloading always seemed neat. I miss [GenServers](https://hexdocs.pm/elixir/1.18.4/GenServer.html). While I’m the first one to point out the warts the BEAM ecosystem has, I always felt more confident in the systems and programs I built using it than I have in any other language, especially once those systems and programs became distributed.

I’m not the first to have this idea. I’ve looked at some of the actor frameworks and setups in Python. Ray and Dask are probably the most popular ones that I know of \- and I’ve taken a deep look into their code. There’s also aborted attempts all over the place at bolting on the resiliency, distributed systems paradigms, and fault-tolerance of the BEAM onto Python.

So the question is now \- why am I doing this?

## Why

One of my mentors once told me that it’s ok to rewrite things that already exist. I think he was alluding to some basic human nature when he said “it comes down to healthy arrogance \- a belief that **you** can do *xyz* better than the other person who did it before.” Without that healthy arrogance, would we have any innovation? Would we have competition? Or would we all still be stuck with some bastardized version of C if no one ever stood up and said “I can do C easier and better\!”. 

We enjoy such a rich ecosystem today because people have either rightfully or wrongfully believed that they could accomplish something better, faster, stronger than those who came before.

My motivation for this project is mixed. I’m honestly not sure if I can accomplish my goals \- or if what I build will be useful for anyone outside a few pet projects. I don’t know if I can compete with Dask, Ray and other actor based frameworks \- but I’d like to at least try.

So humour me. Come join me on this journey of bringing the most important bits of the BEAM and letting people write Python (and maybe eventually other languages?\!) to utilize it without having to learn anything other than a library and maybe a cli.

## What will Re:BEAM be?

It helps to break down projects into some high level goals at first. I can’t take every part of the BEAM I like and build it immediately. So let’s talk about what I feel are the most important bits to focus on first, and some ideas on how I can maybe accomplish that.

I think it’s important to note first that this will be **a runtime.** We’re going to take CPython and extend/embed it (probably with Zig for now). The plan would be to use the low level code (again, probably Zig at this point) to manage the things below. Message passing between Python processes would be handled at this lower level, as well as node networking etc. I’m still fleshing some ideas out. (This is also where I think we differ from existing solutions \- we’re not running Python which then runs C \- we’re running a binary which then runs a VM which runs Python instead).

So here are the things I’m going to focus on building in this low-level area first:

### Supervision Trees

One of the neatest things to me is supervision trees. The capability to dictate that when my program runs, these processes are essential and please do not let them die. Or let them die. Or let one die, and restart the others if it does etc. The ability to group processes together, monitor them, and ensure they’re constantly available speaks a lot to me.

If we’re moving to an actor style framework, where let’s say each python module/entry point becomes its own potentially long-running process, it would be neat to manage those effectively. If I move towards a GenServer type library or setup for Python code \- then I’m going to need this anyways, at least in the underlying runtime. 

### Process Registry

For all this to work we’ll also need to build a process registry. I loved the ability of the BEAM to have a global process registry, shared across nodes, and then a local and user-defined registry. Combined with supervision trees, having a system to help us keep track of running processes and then allowing other processes to discover and communicate with them is a key part of this endeavor.  

### Actors & Message Passing

I want the ability to kick off multiple python processes, and then pass messages between them. Currently, I’m going to pattern this after processes in the BEAM. Each process has its own message box and the ability to send messages to other processes. Each process will be a self-contained Python process, running modules the user provides. I want to be able to pass messages across not only the local machine and threads, but eventually across a cluster. 

I think that by the time I have these three working together, I will have a much better idea of what I can and can’t do \- as well as how huge of an undertaking this might be. I’m doing this for me though, and at the end of the day if no one uses it \- I’ll still be happy that I tried something that, for me, was far out of my comfort zone.

Wish me luck, and come join me\!


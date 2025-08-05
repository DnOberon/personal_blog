---
date: "2025-08-05"
tags: ["development", "erlang", "beam", "python"]
title: "Re:BEAM #2 - Back to Rust"
draft: "false"
summary: "Or how I learned to stop worrying and love `tokio`."
---

I spent some time over the weekend working on this diagram -

![zig diagram](/images/rebeamone.png)

It was a good exercise in getting some of my thoughts on paper, but unless you already have a decent idea of what the BEAM is and [Elixir's GenServer](https://hexdocs.pm/elixir/GenServer.html) pattern - you're probably not going make much sense of it. I just wanted to show you my drawing, so you could hang it on your internet fridge :D

It did get me thinking and tinkering a bit though. I strongly feel one of the most important things you can do to gain confidence and momentum when building a large system, is to test the fundamental concepts as soon as humanly possible. You need to know that various lynchpins of your project are even possible the way you're thinking, or if you're potentially missing some larger picture items that need to be addressed.

There are two important rules I follow when doing this though:
1. **While you might borrow some tedious bits, the majority of any code you write while doing this should be thrown away.** I'm of the opinion that the first pass of anything you build almost always should be chucked - it's typically fundamentally flawed somehow, and is purposefully fast and sloppy because you're just trying to check something. Don't paint yourself into a corner too early.
2. **Aim for the most bare-bones MVP you can.** Doesn't matter if someone else can't run it on their system, if it's not well written, or if you're mocking certain aspects - get the proof of concept to a barely working state and stop. Don't worry if you're not handling edge cases etc. - you'll get to handle all that _joy_ later, when you implement it for real.

That's where I started this weekend - trying to get a zig build up that could launch a simple python script and share some memory.

I ended up going back to Rust.

## In the Beginning
When I started thinking about this  project I was fairly set on Zig. It had the low level control I enjoyed about Rust and no garbage collector. Importantly, it has an excellent interop story and capability with existing C libraries. Once I understood how the zig build file worked, it took me about 5 minutes to include `python.h` in my code and start accessing the C API directly. Everything was fine - until my original way of learning zig (`ziglings`) failed me.

You see, for a while there zig had an `async` and `await` primitive and shipped with a runtime. I don't know the whole story, but for just a while - you could do `async` functions in zig. Because I was looking at doing green-threading for the individual processes, much like the BEAM, having an async runtime out of the box appealed to me.

That regressed completely in 0.11.0, and you could do `async` no longer.

Don't get me wrong - there are still options for async and green-threading in zig - but they're not native to the language, nor do I think they're as mature as something like the `tokio` runtime in the Rust ecosystem. While we can debate the merits of these solutions - the crux of the matter is that suddenly the balance of "easy to write C interop" was being outweighed with "I might have to write my own scheduler and/or channels/coroutines".  While I enjoy writing and controlling every aspect of my software - I simply don't have the time to reinvent the wheel in order to build my truck.

So now I'm back, after about 6 months away and it feels like slipping on an old pair of comfortable work boots.

Where's the butter?

*This is the second article in series titled Re:BEAM - about my efforts to build a BEAM-like environment for Python*




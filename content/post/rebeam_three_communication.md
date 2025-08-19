---
date: "2025-08-19"
tags: ["rebeam", "python", "rust"]
title: "Re:BEAM Pt. 3 - Communication Between Rust and Python"
draft: "false"
summary: "In this article we continue to explore the Re:BEAM project, a new Python runtime for running an actor framework. In this article we discuss communication between the Rust runtime and the Python code it executes. We explore and discuss a few options for this functionality."
---

Before you start reading, please skim the previous Re:BEAM articles on this site. They will help at least lend understanding and lay the groundwork for this article. We do have some ground to cover before we get into how I think message passing is going to work in Re:BEAM.

Let's talk about constraints first.

First, Re:BEAM is about a new paradigm for running python code. While we use the Python interpreter (via the C API), we do not using the interpreter via the CLI.  It might easier to think that an entry point for Re:BEAM _isn't_ Python - but a Rust application.

It's up to the Rust application to run Python scripts in the actor style we're targeting, not the other way around. This is probably the primary difference between this library and other actor libraries/frameworks in the Python space such as [Dask](https://www.dask.org/) etc..

Second, the end user of Re:BEAM _**should never have to write Rust_**. Unless they really want to get their hands dirty, or change the underlying behavior of the runtime - a normal user should not have to write Rust.

These are the two major constraints for this project/library/framework. These constraints have and will continue to flavor all the technical choices being made throughout the project. I am a firm believer that a system without constraints becomes an "everything machine" - and serves no single purpose well. So, let's avoid that.

Now let's talk about communication between Python and Rust.

## The Problem

Re:BEAM is utilizing the [pyo3](https://github.com/PyO3/pyo3) Rust library - which is basically just a safe set of bindings to the Python C API. The C API enables us to embed and run our own interpreters, functions etc. - and the Rust library allows us to do safely.

There's a big caveat however - in that while we can run a Python interpreter, and pass certain kinds of data into it, we can't pass opaque Rust types or references around in the running Python code (at least not that I've found).

What I mean is that given let's say, a `mpsc::Sender` wrapped in an `Arc` - I can't pass that into any Python code being interpreted with `pyo3`/C API.

The last interop in Rust I worked with, Node.js, allowed us to send opaquely wrapped Rust values into host language. While Node.js couldn't work with the value directly, we could use it to share Rust values/references when it called back out to the native module. You can't do that with `pyo3`, that I've found - but please, please correct me if I'm wrong.

#### Why is the lack of this feature a big deal?

I would like Python code being run by Re:BEAM to have a handle back _into_ the Rust process that's running it. There are various reasons for this:
- Sharing state information, like process registries
- Executing Re:BEAM runtime functionality from Python, so that users don't have to use Rust.
- Communicating synchronously to other processes when required
- Managing/monitoring of supervision trees

This makes a hybrid program, Rust+Python, much harder to bring about - and honestly I thought about throwing my hands up and either abandoning the project or writing the core runtime in Python with Rust module support. Neither option appeals to me. One, I need something to keep me busy and two, having the runtime be in Rust is a key part of this project and I feel like is the easiest way to get the memory safety and general resilience guarantees that anything approaching the BEAM would need to have.

So I started thinking, and I'd like to share some potential solutions with you. The rest of the article is broken up by solutions to the communication issue and one of the major aspects of the Re:BEAM system it serves.

## The Process Registry

One of the aspects of the BEAM is that every process/actor is registered somewhere. These registries have different namespaces. Some nodes are globally registered across nodes in a cluster, local only to that node, or in named registries which may be both. These registries expose methods for the engineer to query the registry and find a certain process - and lay the groundwork for message passing between processes that the BEAM itself uses.

The question is - how can a bit of Python code which is being executed access the current process registries and get information from them? We've already established that we can't pass a hook back into the Rust runtime from Python, and that two way communication between the Rust caller and the Python code being executed cannot exist via `pyo3`, so how can facilitate this?

Let's tackle communication **to** Python first, examining a method for passing the information from registries.
#### Python Registry Hydration
My solution to this works, though it's not efficient. Prior to executing a Python module, or prior to executing methods on any `PyObect` in the `pyo3` library - we have the option to manipulate its attributes via the Rust bindings to the C API.

Typically a Python module has a few attributes already - such as `__module__` which represents the module's name etc. Because Python is fairly permissive with how you set and manipulate these attributes (much to the chagrin of compilers everywhere) we could, theoretically,  use Rust to set our own module attributes _prior_ to actually running anything through the interpreter.

With this in mind then, what if we simply pass the various registries as module attributes for the `rebeam` module to use?

So someone might be able to do something like:

```python
process_name = __global_registry__.find("process_name")
```

`__global_registry__` is a class which we have set and instantiated via Rust with internal attributes and methods. Said internal attributes contain a current copy of the various process registries, which are potentially simply a list of tuples of `(process_hash, process_name)` or a similar small data structure.

If we got real fancy - we could even do some AST parsing and check to see if the Python code we're about to run through the interpreter contains any calls out to the specific registries and copy only those registries into the execution.

This is inefficient as we're copying the registries for each loop of the process - but it works. Considering that we won't have the thousands of processes like the BEAM typically does, this process should be able to scale relatively well. While a new process might show up between copy and execution, it's not a big deal as the system is a loosely coupled, eventually consistent model anyways, and each actor is processed linearly. At the end of the day this means that the code you write should take into account that it might execute before the process you might rely on from the registry.

#### New Process Registration from Python

So now that we've got process data _into_ Python - what happens if the Python process spins up up more Python processes via a `PySupervisor` which then need to be monitored? How can we communicate this back to the parent Rust process?

I originally explored the reverse of the method mentioned above. Have my internal Python `rebeam` module write attributes to itself with the names of any new processes. Then, once we've executed the current loop and the Python module's code has exited, check the module's attributes to see if anything was set and pending execution and execute them.  Theoretically, this could also work - but there is a big danger here:

- Processes registered this way will not be started until _after_ the Python code executes fully. So if halfway through your script you're starting processes with the `rebeam` module - they wont' be available until the next loop through that code.

I don't think this makes this option a non-starter, but it is not to be treated lightly. With no easy way to indicate that a process won't be started until after their code executes we add cognitive load to the programmer.  We are already asking users to change how they think about how their programs run - we can't keep adding to that tab and never expect it to come due. While the hydration method works for short lived executions and injecting data _into_ a Python process, it cannot fulfill the reverse easily or ergonomically.

Enter [Unix Domain Sockets (UDS)](https://en.wikipedia.org/wiki/Unix_domain_socket)

## Unix Domain Sockets & The Death of Windows Compatibility?

First, if I do decide to pursue using UDS, then this runtime will no longer be compatible with Windows. I'm sure there is something equivalent we could do, but whether or not that gets pursued is up in the air. So the first question I have to answer while exploring this option is, am I willing to nuke Window compatibility?

**Yes.**

With that out of the way, let's talk about why this solution _may_ work.

We would like two-way communication between two processes. It doesn't matter that one is embedded in the other - they are different enough that real-time, two way communication between the two is impossible through the languages themselves. We've discussed a bit already why this is, and if I need to clarify this article in the future to expand this section let me know please.

So if we can't use the language's tools to communicate, can we use the execution environment somehow?  If these were two independent processes, across machines, we'd reach for a network protocol. HTTP, RPC etc. - and I think that's the right idea. However, since we are on the same machine, and potentially the same core even, we don't need or want the overhead of a network protocol.

Thankfully, Unix allows us to use sockets _without_ the use of a network stack with it. This boils down to a one producer, potentially multiple consumer architecture, where the producer simply writes a stream of bytes to the socket to be read by the consumer(s).

This might work for us. We _could_ ensure that each Python process is given it's own socket. Even with a thousand processes this shouldn't be a problem - as we're limited only by the amount of file descriptors we can create and hold at any one time. The Rust runtime would have a single socket as its inbox, and then internally it would route the messages to the proper `tokio` thread or process.

Let's revisit how this would work with process registration.

On initialization, as part of the hydration, we ensure that the `rebeam` Python module has the address of the Rust socket. Then, whenever we do something like `rebeam.send(message)` a message is written to that socket. If we expect a reply, we would expect Rust to write to _our_ Python process's socket - so we loop and listen there for any new messages. Registration could work as follows:
1. The Python process calls `rebeam.run_register_process(script_path, GenPy instance etc)`
2. The `rebeam` module writes a message to the Rust socket containing the message id, message type (run_register_process), a return address being the Python process's open socket, a payload, and whether or not we're waiting on a reply.
3. The `rebeam` module reads its socket, peeking until it sees a message replying to the message id it sent (we might fully read and then write back what messages aren't the one we're waiting on, this is fine because this is all single threaded but I digress)
4. The `rebeam` function returns whatever is expected by the function from the message it received
5. Program continues execution.

This isn't without its own issues. UDS aren't the worlds easiest things to work with. Thankfully, Rust has a pretty solid wrapper around them - but it's still risky and we have now to deal with a serialization/deserialization layer for messages.

Honestly? I think a lot is going to come out as we implement these solutions. I think we're going to end up using a mix of both hydration and UDS in the end system - that is unless we find something better. If you know of something better, that fits my constraints and **does not involve** setting up a third system (such as Redis etc.) then please reach out and let me know!

Thanks for reading!
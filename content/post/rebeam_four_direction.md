---
date: "2025-08-31"
tags: ["rebeam", "python", "elixir", "beam"]
title: "Re:BEAM #4 - A New Direction"
draft: "false"
summary: "In this article we continue to explore the Re:BEAM project, a new Python runtime for running an actor framework. Recently, I discovered I was going in the completely wrong direction with regards to the underlying architecture of the runtime. This article explains the upcoming changes to Re:BEAM and why they are exciting."
---
# Re:BEAM #4 - A New Direction

I had a very small, very powerful conversation with [José Valim](https://www.welcometothejungle.com/en/articles/btc-elixir-jose-valim) this week which has changed the direction in which Re:BEAM was heading. I have been very fortunate in that my previous job with the Idaho National Laboratory to have been put a position that I was able to build a small relationship with José. Every once in a while I still touch base, and this most recent catch-up I asked a couple of questions about their efforts to incorporate Python into [Livebook](https://livebook.dev/).

Most of their efforts in this direction are encapsulate in the [Pythonx](https://github.com/livebook-dev/pythonx) Elixir library (and Erlang NIF). This library allows users to embed the Python interpreter into the same OS processes as your Elixir application and to convert back and forth between Elixir and Python data structures.

If you've read up on my blog before, you'll be aware that Re:BEAM isn't about simply embedding a Python interpreter into a different language or runtime, but changing how Python engineers execute their programs in a distributed environment.

Let's go over Re:BEAM's goals and the desired ergonomics.

# Re:BEAM Recap
*Note: most of this is pulled directly from the [codeberg repository](https://codeberg.org/im_john_here/rebeam)*

The idea behind this project is to provide Python users with an alternative to simply running their applications with `uv` or `python main.py` etc. I miss working with Elixir dearly, and the BEAM most of all. I want to bring a similar actor system to Python which doesn't require the end user to think about their code any differently unless they want to take advantage of `rebeam`.

## The Primary Constraints
`rebeam` has two major constraints which guides its design.

> 1. Users of `rebeam` must not be required to write anything other than Python

This first constraint is the most important. If I expect any kind of adoption in the Python ecosystem, then I cannot introduce another language - potentially even a configuration language - and expect them to embrace it. Apart from using a different CLI to run your Python code, you shouldn't be required to do anything else to make it work.

> 2. The governing process, or underlying actor framework/infrastructure/ecoystem, must not use the Python interpreter to be executed. Compiled (and potentially statically linked) binaries are preferred when possible.

Python has a few issues if you're seeking to build a highly available, resilient , and recoverable system. While I won't spend a lot of time going over that here, my opinion is that an interpreted language with many warts regarding asynchronous execution and multi-threading is not a solid foundation for anything approaching the BEAM.


## The Ergonomics & Examples
I think it's important to go over what I want this tools ergonomics and user story to look like.  Like the primary constraints, these are goals to which we aspire because they impact how readily this tool might be adopted and used in the ecosystem. If the tool is too hard to integrate with existing code, too difficult to understand, or requires a lot of specialized knowledge then it will fail the goal of general adoption.

### Main Application
Given a python project with an entry point `main.py` - a user of `rebeam should _only_ have to run `rebeam main.py` with whatever system arguments that their script might require (or options that `rebeam` might need).

#### `main.py`
This is an example of what `main.py` might look like under a `REBEAM` project.

```python
from genpy_one import GenPyOne
import forever
from rebeam import Supervisor

def main():
    print("HELLO, WORLD")
    # your other script execution here

    # much like Elixir, this is a set of python modules, or GenPy servers
    # to run under the supervision tree
    return Supervisor(modules=[
        # GenPy modules kwargs could represent various options, init values
        GenPyOne(name="genpy name"),
        forever,
        # webserver.webserver
    ], strategy=ONE_FOR_ALL) # the second part of the tuple is the supervision strategy

if __name__ == "__main__":
    main()

```

The execution order of this script would be as follows:
1. The body of the script is executed as if we were running `python main.py` - and `main()` is executed
2. A `rebeam` supervisor is initialized with items. The execution is slightly different for each type of item in the list
    - ***GenPy* class**: `GenPy` represents our version of Elixir's [GenServer](https://hexdocs.pm/elixir/GenServer.html), `rebeam` takes the initialized class and runs its `start` function (see the example of a `GenPyOne` below) and then maintains an instantiation of this class as a supervised actor.
    - **Python module/function**: `rebeam` simply executes this module or function - typically this would be something like webserver, or long-running python   process
    - **Path to Python script**: Given a path to a python script, `rebeam` will attempt to first execute the script as a `GenPy` instance, if that doesn't work, then it will treat it as a module.
3. `rebeam` will run until it encounters an unrecoverable error - and will attempt to restart `main.py` depending on the supervision options you've passed to the command line call


#### `GenPy` example

```python
from rebeam import start

@dataclass
class GenPy:
    state: dict = field(default_factory=dict)

    def __new__(cls, _opts:dict):
        return GenPy()


class GenPyOne(GenPy):
    name: str

    def __init__(self, name:str | None=None):
        if name:
            self.name = name


    @start()
    def start(self):
        # immediately we're met with a question - where does state management happen? On the python
        # class itself held in memory, is that safe? It's probably for the best as what people are putting
        # into state are python objects....
        self.state["test"] = "test"
        # because an instance of GenPy classes will NOT have their methods run in parallel or concurrently, we
        # can safely assume that no other method is going to modify state while we are. These guarantees should probably
        # be held by the main loop
        return
```


### Message Passing

One of the key aspects of an actor based system is how actors communicate with each other. In this case, actors will communicate via message passing - managed by `rebeam`. The example below shows a simple example of how message passing works. This makes some assumptions about how we get the `ProcessID` dataclass.

This process should be opaque to the user, but allow us to do zero-copy messages of even things like data frames between processes on the same node.

#### Sender
```python
from rebeam import cast, call
# given that source_process is an instance of ProcessID representing the caller *Optional*
# given that target_process is an instance of ProcessID, which is needed for rebeam to route the message

# call is a synchronous call pausing your programs execution until a response is received, response is a tuple with status and response
# this call does not take a source process due to the message passage back being handled by rebeam
status, response = call(target=target_process, subject="receive", message={"message": 1})

# cast is an asynchronous call, returning only a boolean representing message successfully sent
# if you want to handle the response of this message, the calling process _must_ by a GenPy process
# with a receive command
status = cast(target=target_process, subject="receive", message={"message": 1}, sender_pid=source_process)
```

#### Receiver
```python
from rebeam import GenPy, ProcessID, receive, response_ok, start

class Receiver(GenPy): # extends the GenPy process
    # this example doesn't show any state management
    @start()
    def start(self) -> ProcessID:
        return ProcessID()

    @receive()
    # a bare decorator can only be used once and is considered the catch all function for messages
    # which do not have a target function
    def catch_all(**args):
       return response_ok()

    # unlike Elixir - we do not have a separate kind of receiver function for async vs. sync messages
    # rebeam will handle how the result of this function should be passed back to the caller
    @receive("call_receive")
    def whatever(source:ProcessID, message: dict):
        # note that source could be null, if the caller is unknown or this was trigged by a process
        # which is no longer alive
        print(message)
        return response_ok({"response": "response"})
```

___________

# A New Direction

There were a few previous constraints which I didn't mention above, mainly because they are now out of date. For example, I wanted the parent process, the CLI, to be a single binary if possible. Doing so would greatly improve my ease of distribution, and if I choose an easier to cross compile language like Zig or Rust (I KNOW I KNOW) then I could potentially meet that goal.

It was this constraint, and not wanting to write any C or C++ code directly which led me _away_ from simply using the BEAM and Elixir itself for the parent process. I felt like to get as surgical as I needed to go, working through a NIF and then through Elixir wasn't going to be worth the pain. However, **I was wrong to assume that the level of effort in creating a BEAM like system in Zig/Rust would be less than using the BEAM and using a NIF with Elixir.**

Honestly, in hindsight I can't believe I thought the opposite at any point. I don't know if it was excitement over using Zig or getting back into the Rust ecosystem, or some erroneous thoughts that I wouldn't get the control or ergonomics I needed in Elixir. Either way, I was incorrect in thinking that I couldn't achieve the same goals and fit within almost all the same constraints with Elixir and the BEAM.

One of the final missing puzzle pieces that got me back on the Elixir and BEAM track was delving more deeply into how Pythonx worked. Once I understood that they were literally parsing the language into AST at some points and _then_ deciding how to execute did the realization of how I can achieve the message passing ergonomics I was hoping for. As I was hoping not have the user either return their Python function or write additional languages to be able to send and receive messages within a function body.

Now, the plan for inter-process communication would be to have Elixir/NIF parse the Python into AST and then basically execute sequentially. When a message passing operation is encountered, execution gets paused and the message is handled by the parent process - injecting any return values into the running Python program if needed. While still difficult to get right and leaving the zero-copy aspects unanswered, it's not going to be impossible anymore.

So over the next few days you'll see a drastic change in the repo as I rip out the Rust code and rebuild from the ground up yet again.

Let's go!

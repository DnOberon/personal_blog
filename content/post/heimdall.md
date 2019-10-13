---
date: "2019-10-11"
tags: ["cli", "golang", "console", "norse", "asgard"]
title: "Heimdall"
draft: "false"
summary: "The Norse god [Heimdall](https://www.britannica.com/topic/Heimdall) was the watchman of the Norse gods. He dwelt at the entry of Asgard and stood guard over Bifrost, the Rainbow Bridge, which connected Asgard to Earth. Through Heimdall and Bifrost the Norse gods kept watch over and interacted with Earth and the humans living there.

Waxing poetic (and very arrogant) I think we can consider ourselves gods over our programs. We watch over them from afar, interacting with them through a bifrost of command lines and gui’s. We care about their health and performance and we strive to insure they fulfill their function."
---

# Heimdall The God

The Norse god [Heimdall](https://www.britannica.com/topic/Heimdall) was the watchman of the Norse gods. He dwelt at the entry of Asgard and stood guard over Bifrost, the Rainbow Bridge, which connected Asgard to Earth. Through Heimdall and Bifrost the Norse gods kept watch over and interacted with Earth and the humans living there.

Waxing poetic (and very arrogant) I think we can consider ourselves gods over our programs. We watch over them from afar, interacting with them through a bifrost of command lines and gui’s. We care about their health and performance and we strive to insure they fulfill their function.

I was recently developing a .NET console application that interacted with a hidden, third-party application. My application instructed the hidden process to initiate a data exports. It was here, after an export started running that I ran across a few problems.

First, the hidden application output its own logs into stdout and stderr, polluting my logs and making it hard to follow the application’s progress.

Second, the hidden application had a tendency to hang unexpectedly. Restarting the export process wasn’t a problem, the hidden application would start where it left off, but there was no easy way for my application to know that the other process had frozen.

Third, the hidden application must have a memory leak because when the export runs long enough, if it’s a big enough batch of data, the host system would eventually run out of memory. This breaks both the export process and my application, everything grinds to a halt.

I needed a tool that could watch both applications, filter logs, monitor system resources, and restart the application it was watching in case of program hang.

I needed a Heimdall.
</br>

# Heimdall The Application

In order to solve the problems above, `heimdall` (little h for the application) needed to have the following features:

- Windows compatible
- Host system must not be required to have any specific runtime - e.g Ruby
- Easy, quick command line configuration and execution
- Automatic retry n times
- Kill or restart a hung program
- Filter logs from stdout and stderr and write them to a separate log file

The first two requirements made choosing what language to write heimdall in easy - heimdall is written in [Go](https://golang.org/).

Compiled Go requires no runtime to execute and compiling Go to target various platforms [Windows included](https://github.com/golang/go/wiki/WindowsCrossCompiling), is as easy as passing a few flags into its compiler. And because most Go's standard library is designed to easily work on the platforms it targets, I didn't have to worry about writing different code for each operating system heimdall will run on (mileage of this statement will vary depending on any future features, but it’s accurate for now).

A quick example of what I mean. This small application fetches all the network interfaces on the host machine and prints their information to console. It uses the standard libraries `os` and `net` to accomplish the bulk of the work. Both packages are well documented so that you can be confident that what you use from those packages will work on the system you desire

{{< highlight go  >}}
package main

// These packages are all from Go's standard library. All of their functions work on the majority
// the platforms that Go's compiler can target. Using these packages means we can be sure that our
// application can work across systems. Keep in mind that are cases in which this isn't the case, but
// they are not the norm. Read package documentation if you're in doubt.
import (
"fmt"
"log"
"net"
"os"
"time"
)

func main() {
file, err := os.Create("log.txt") // os.Create returns a pointer to a os.File type
if err != nil {
log.Fatal(err) // Go's best practices specify that errors should be handled, not panic'd
}

    for {
        addressesAndInterfaces(file)

        time.Sleep(5 * time.Second) // time.Second is a constant provided by the time package
    }

}

func addressesAndInterfaces(file *os.File) {
// You should research io.Reader and io.Writer interfaces - it is better to use
// those than using WriteString() all over - but for now this serves our needs

    file.WriteString(time.Now().String() + "\n")

    interfaces, err := net.Interfaces()
    if err != nil {
        log.Printf("%s", err.Error())
        return
    }

    for _, inf := range interfaces {
        addresses, err := inf.Addrs()
        if err != nil {
            log.Printf("%s", err.Error())
            continue
        }

        for _, a := range addresses {
            log.Printf("%s : %s", inf.Name, a.String())

            file.WriteString(fmt.Sprintf("%s : %s\n", inf.Name, a.String()))
        }

    }

}
{{< / highlight >}}

</br>
</br>
### Using Heimdall

#### Installation

If you have the Go toolchain installed you can simply run

`go get github.com/dnoberon/heimdall`

If not, you can download any of heimdall’s releases for your platform [here](https://github.com/DnOberon/heimdall/releases). Future plans for heimdall include creating homebrew recipes as well as a few other package managers, but for now you’ll have to either build from source, use Go’s `get` command, or download the application manually.

The easiest way to get started with heimdall is to ask for its help menu.

```
> heimdall -h

Heimdall gives you a quick way to monitor, repeat, and selectively
log a CLI application. Quick configuration options allow
you to effectively test and monitor a CLI application in
development

Usage:
  heimdall [flags]

Flags:
  -h, --help               help for heimdall
  -l, --log                Toggle logging of provided program's stdout and stderr output to file
  -f, --logFilter string   Allows for log filtering via regex string. Use only valid with log flag
  -r, --repeat int         Designate how many times to repeat your program with supplied arguments
  -t, --timeout duration   Designate when to kill your provided program
  -v, --verbose            Toggle display of provided program's stdout and stderr output while heimdall runs
```

</br>
Let’s run through a quick example based on the problem that started this whole thing - a console application managing a third-party, hidden application. I want heimdall to filter the logs that both my application and the hidden one outputs as well as killing my application if it hangs.

Telling heimdall to do that is easy -

`heimdall --timeout=30m --log --logFilter=<[^<>]+> exportApplication`

</br>

# Heimdall The Future

Heimdall’s [source code](https://github.com/DnOberon/heimdall) and [releases](https://github.com/DnOberon/heimdall/releases) are completely open source and I encourage you to explore both. I also encourage you to take a [tour of Go](https://tour.golang.org/welcome/1) to learn more about my favorite programming language.

I’m excited about the future of heimdall, intrigued by the technical problems waiting to be solved, and hopeful that someone other than me will enjoy using it. 

Here are a few features I’d like to see added:

- Configuration files - manage heimdall options on a per application basis instead of having to specify arguments from the command line.
- Rotating parameters - useful if you’re developing a console application and want to test various kinds of input. Couple this with the log filtering, automatic repeat, and other features.
- Callbacks - sends a notification (sms, http, desktop notification etc.) on application completion.

I’ve debated for a couple of days about whether or not to continue working heavily on heimdall and ultimately decided to move on to different projects. While heimdall solved my immediate need, I can’t see myself using it for any other of my current projects.

Until I find myself reaching for the tool a few more times, wishing I had some of the future features, or have a user base however small - I'll let Heimdall continue his lonely vigil at the gates of Asgard.




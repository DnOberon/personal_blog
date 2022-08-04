---
date: "2022-07-30"
tags: ["development", "nodejs", "interfaces", "queue", "event-driven"]
title: "Simple Message Queue Interface with Node.js and Typescript"
draft: "true"
summary: "An explanation and examples of a simple message queue processing interface in Node.js using Typescript"
---

You’ll often find yourself needing to implement message processing in your career. From RabbitMQ, SQS, and Azure Service Bus I find it very common that recent architecture I visit either utilizes or benefits from a message/event driven system. In fact, I recently implemented a very simple setup on the open-source data warehouse (DeepLynx)[https://github.com/idaholab/Deep-Lynx]. The code in this post, while not exactly the same, borrows heavily from that open source project, and I hope this counts as correct attribution. I also hope that my simple implementation will be an inspiration and allow you to iterate and improve upon a solid foundation. 

First, let’s keep in mind that we’re going to utilize interfaces. I won’t spend a ton of time here discussing the why of interfaces, or how they work. Just know that in this particular situation we needed to potentially support different message queue providers, as well as provide an implementation that didn’t rely on third-party services (which is a whole other blog post). An interface allowed us to quickly switch implementations at run-time without having to edit code. I’ll be the first to admit this particular interface might be a little brittle, it’s declared far away from the code that uses it, but it functions and serves its purpose well.

So here you are, in all its glory, our message queue interface. Explanation for each part is in the code, easier for you to associate what each part does.

```typescript
/*
    Queue defines a very simple interface for a message queue emitter and processor to implement. 
 */
export interface Queue {
    // Init should be called prior to using the queue interface. This allows any
    // setup or connections to be made correctly. We make this explicit instead
    // of relying on the constructor for two reasons - 1. it allows use to use
    // async/await by returning a promise and 2. it explicitly defines a setup
    // step that each individual implementation can take advantage of
    // returns false if the connection could not be made
    Init(): Promise<boolean>;

    // Consume is a never-ending function which reads messages from a queue and emits
    // them to the destination - your Writable contains the functionality meant to fire
    // for each message. This could be a one off, or something that looks for a function 
    // in a registry depending on message content. Note that the Writable MUST be in object
    // mode
    Read(queueName: string, destination: Writable): void;

    // Push a message onto the queue - granted the queueName variable is slightly brittle 
    // as you might need to store something other than a string for the identifier of an 
    // individual queue
    Push(queueName: string, data: any): Promise<boolean>;
}
```


And here is the implementation for RabbitMQ. Again keep in mind that this is a simple implementation for demonstration purposes only. There are various features and functionality your event driven system might want to utilize, and your queue provider should eventually be able to provide that. I also won't be covering basic RabbitMQ, amqplib usage here, so you might need to do a little reading.

```typescript
import {QueueInterface} from './queue';
import {Writable} from 'stream';
import {Channel, Connection, ConsumeMessage, Replies} from 'amqplib';
import AssertQueue = Replies.AssertQueue;
const amqp = require('amqplib');

export default class RabbitMQQueue implements QueueInterface {
    channel: Channel | undefined;

    Init(): Promise<boolean> { // could easily return a string denoting connection status as well
        return new Promise((resolve) => {
            amqp.connect(Config.rabbitmq_url)
                .then((connection: Connection) => {
                    return connection.createChannel();
                })
                .then((channel: Channel) => {
                    this.channel = channel;
                    resolve(true);
                })
                .catch((e: any) => {
                    resolve(false);
                });
        });
    }

    Read(queueName: string, destination: Writable): void {
        void this.channel
            ?.assertQueue(queueName)
            .then((ok) => {
                this.channel?.consume(queueName, (msg: ConsumeMessage | null) => {
                    if (msg) {
						// your destination/Writable must be in object mode, not buffer
                        destination.write(JSON.parse(msg.content.toString()), () => {
                            this.channel?.ack(msg);
                        });
						// you might want to consider handling null messages at some point
                    }
                });
            })
            .catch((e) => {
				// you might want to consider throwing an error here or logging if you run into issues
                // because this function is never-ending and we typically return void, we went with logging
            });
    }

    Push(queueName: string, data: any): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.channel) {
                this.channel
                    .assertQueue(queueName)
                    .then((ok: AssertQueue) => {
                        if (this.channel) {
							// JSON.stringfy allows us to push objects to the queue
                            resolve(this.channel?.sendToQueue(queueName, Buffer.from(JSON.stringify(data))));
                        } else {
                            resolve(false);
                        }
                    })
                    .catch((e) => {
						// again some logging might benefit you
                        resolve(false);
                    });
            } else {
			    // log here or in the caller	
                resolve(false);
            }
        });
    }
}
```

And here is a queue being used, in this case we're simply logging each message we received from the queue. `Consume` can be safely called and then moved on from.

```typescript
// QueueFactory in this case was a simple function that looked at our config and returned the correct
// implementation of Queue depending on the value. This is the recommended method for using Queue,
// avoid needing to call the implementations directly
QueueFactory()
    .then((queue) => {
        const destination = new Writable({
            objectMode: true,
            write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
				console.log(chunk)
                return true;
				// please read up on streams - there are things like backpressure and 
                // other things you should understand when working with streams so that 
                // you manage memory and CPU well. Since this article is focusing more
                // on the queue implementation and less on streams, I highly recommend
                // some external study
            },
        });

        destination.on('error', (e: Error) => {
			// you'll need to explicity handle stream errors, ignore at your peril
        });

        queue.Consume({queueName}, destination);
    })
    .catch((e) => {
		// whatever sort of error logging you need.
    });
```

I'm a firm believer in letting the code speak for itself. I hope in this case the code and my comments highlight exactly how you could implmeent a similar system. Please feel free to reach out me if you have any questions/comments/concerns!

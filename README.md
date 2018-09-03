# Redis-Q Job Manager
> Manage jobs using redis queues

## Preface
In normal scenario, tracking and processing job is little typical. This library is trageted to make that simpler and effective

## Features
1. Create a job.
2. Delete a job.
3. Track a job progress.
4. Generate job reports

## Getting started.
Redis-Q Job manager will work on all systems which can run node.

## Install
```bash
npm install @evolving-bubble/redis-q
```

## Usage

### Examples

 - Create a publisher

Will create a publisher connection with redis, when redis isReady we can start pushing data

```bash
const JobManager = require('@evolving-bubble/redis-q')
const publisher = new JobManager.Publisher({
    redis: {
        connectionType: 'NORMAL',
        host: 'localhost',
        port: '6379',
    },
    jobPrefix: 'JobManager'
});

if(publisher.isReady()){
    publisher.push([{ 1: 1, 2: 2 }]);
}
```

 - Create a db publisher

Will create a DB publisher connection with redis, when redis isReady we can start pushing data, it will fetch data from db using searchOptions and will push in redis as part of job


```bash
const JobManager = require('@evolving-bubble/redis-q')
const dBPublisher = new JobManager.DbPublisher({
    jobName: 'test-DBPublisher',
    schedulerTime: '*/1 * * * * *', // Every 10 secs
    db: {
        host: 'localhost',
        port: '3306',
        user: 'username',
        password: 'password',
        database: 'testDatabase',
        table: 'testTable',
        tableFields: [
            {
                key: 'order_id',
                type: 'varchar'
            },
            {
                key: 'customer_id',
                type: 'varchar'
            },
        ],
        searchOptions: [{
            key: 'order_id',
            operator: 'eq',
            value: '4295046610'
        }]
    },
    redis: {
        host: 'localhost',
        port: '6379',
        connectionType: 'NORMAL'
    },
    jobPrefix: 'JobManager'
});

dBPublisher.exec();
```

 - Create a subscriber

 Will create a subscriber that will be listening to queues and will run the callback if some message gets added to Queue

```bash
const JobManager = require('@evolving-bubble/redis-q')
const subscriber = new JobManager.Subscriber({
    redis: {
        connectionType: 'NORMAL',
        host: 'localhost',
        port: '6379',
    },
    jobPrefix: 'JobManager',
    callback: (message) => {
        return new Promise((resolve, reject) => {
            Promise.resolve()
                .then(() => {
                    console.log(message);
                    return resolve();
                })
                .catch((error) => {
                    return reject(error);
                });
        })
    },
    callbackTimeOut: 2 * 1000
});
subscriber.process();
```


 - Create a job

 Will create a job object to track job progress and to generate reports

```bash
const job = new Job({
    redis: {
        connectionType: 'NORMAL',
        host: 'localhost',
        port: '6379',
    },
    jobPrefix: 'JobManager'
});

setTimeout(() => {
    job.generateCSVReport('6372bae0-14ed-4b0e-bd61-6775ff81f2e5');
    job.generateJSONReport('4ff188bd-5572-4455-bcac-f5c758e9f924');
    job.peek('4ff188bd-5572-4455-bcac-f5c758e9f924');
}, 1000);
```

## How to contribute
Have an idea? Found a bug? See [how to contribute][contributing].

## Have a problem? Come chat with us! ##
[LinkedIn](https://www.linkedin.com/in/yogeshyadav108098)<br />
[Twitter](https://twitter.com/Yogeshyadav098)<br />
[Github](https://github.com/yogeshyadav108098)<br />
[Gmail](<mailto:yogeshyadav108098@gmail.com>)

## Maintained by ##
[Yogesh Yadav](https://www.linkedin.com/in/yogeshyadav108098/)

## Support my projects

I open-source almost everything I can, and I try to reply everyone needing help using these projects. Obviously,
this takes time. You can integrate and use these projects in your applications *for free*! You can even change the source code and redistribute (even resell it).

However, if you get some profit from this or just want to encourage me to continue creating stuff, there are few ways you can do it:

 - Starring and sharing the projects you like
 - **Paytm** You can make one-time donations via Paytm (+91-7411000282). I'll probably buy a coffee.
 - **UPI** You can make one-time donations via UPI (7411000282@paytm).
 - **Bitcoin** You can send me bitcoins at this address (or scanning the code below): `3BKvX4Rck6B69JZMuPFFCPif4dSctSxJQ5`

Thanks!


## Where is this library used?
If you are using this library in one of your projects, add it here.


## License
MIT © [Yogesh Yadav](https://www.linkedin.com/in/yogeshyadav108098/)

[contributing]: /CONTRIBUTING.md
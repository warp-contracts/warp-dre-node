# warp-cache-node

### How it works

1. The **Warp Gateway** is publishing a message to the Redis pubsub (a public Redis instance is currently created on [DigitalOcean](https://cloud.digitalocean.com/databases/db-redis-fra1-14884?i=c46683)) - on the `contracts` channel.  
Messages sent via this channel contain fields:
   1. `contractTxId` - self-explanatory
   2. `isUnsafe` - set to `true` if the contract is unsafe 
2. `warp-cache-node` is subscribing for messages on the `contracts` channel.
3. `warp-cache-node` is creating its own `evaluation` queue - using [BullMQ](https://github.com/taskforcesh/bullmq#readme) (which is using local Redis instance)
4. Each time a new message comes to the `contract` channel - `warp-cache-node` is verifying whether
   1. the contractTxId is valid - if not, it returns
   2. the contract is unsafe - if it is, it returns (some nodes might decide to evaluate unsafe contracts)
   3. the job for the contractTxId is not being currently processed - if it is, it returns
   4. the previous processing for this contract have ended at least N seconds before - if not, it returns

If all the above conditions are met, a new task is added to the `evaluation` queue.
5. The workers for the `evaluation` queue are defined as [Sandboxed](https://docs.bullmq.io/guide/workers/sandboxed-processors) processors.
The worker takes next job from the queue and evaluates the contract state using **Warp SDK** (with the LMDB cache attached)

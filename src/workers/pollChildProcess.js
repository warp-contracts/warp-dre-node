const pollProcessor = require('./pollProcessor');

process.on('message', (input) => {
  pollProcessor(input)
    .then(() => {
      process.send({
        failed: false,
        message: `Contract update ${input.data.contractTxId} finished`
      });
    })
    .catch((e) => {
      process.send({
        failed: true,
        message: `Contract update ${input.data.contractTxId} failed`,
        error: {
          name: e.name,
          message: e.message,
          cause: e.cause,
          stack: e.stack
        }
      });
    });
});

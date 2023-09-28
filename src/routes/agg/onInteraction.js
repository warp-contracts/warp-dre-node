const { upsertInteraction } = require('../../db/aggDbUpdates');
module.exports = {
  onNewInteraction: async function (contractTxId, interaction) {
    const { tags, owner, id, block } = interaction;

    if (tags) {
      const indexesString = tags.find((tag) => tag.name === 'Indexed-By');

      if (indexesString) {
        const indexes = indexesString.value.split(';');

        if (indexes.length > 0) {
          await upsertInteraction(contractTxId, id, owner.address, block.height, indexes);
        }
      }
    }
  }
};

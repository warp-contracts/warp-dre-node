module.exports = async (ctx) => {
  ctx.status = 200;
  ctx.body = {
    status: 'alive'
  }
};

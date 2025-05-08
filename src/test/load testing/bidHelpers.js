// Use this instead of ES modules
function randomBidAmount(context, events, done) {
    const min = 100;
    const max = 1000;
    context.vars.amount = Math.floor(Math.random() * (max - min + 1)) + min;
    return done();
  }
  
  function getAuctionId(context, events, done) {
    const auctions = ["auction_123", "auction_456", "auction_789"];
    context.vars.auctionId = auctions[Math.floor(Math.random() * auctions.length)];
    return done();
  }
  
  // Export as CommonJS
  module.exports = {
    randomBidAmount,
    getAuctionId
  };
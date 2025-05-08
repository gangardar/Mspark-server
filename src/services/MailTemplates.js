export const auctionCompleteTemplateForMerchant = (auction) => {
  const gem = auction.gemId;
  const merchant = auction.merchantId;
  const winner = auction.highestBidderId;
  console.log(auction);
  console.log(auction?.gemId);
  console.log(gem);


  const body = `
      <h2>Auction Completed: ${gem.name}</h2>
      <h3>GemId: ${gem._id}</h3>
      ${
        winner
          ? `<p>Final Price: ${auction.currentPrice}</p>`
          : `<p>No bidder, try auctioning again.</p>`
      }
      <p>Gem Type: ${gem.type}</p>
      <img src="${process.env.BASE_URL+'/'+gem.images[0]}" alt="${gem.name}" width="200">
    `;
  return {
    subject: `Your auction for ${gem.name} has completed`,
    html: `
          ${body}
          ${
            winner &&
            `
              <><p>The winning bidder was: ${winner?.username}</p>
              <p>Gems will be delivered to the winner first</p>
              <p>After the product has reach the winner soundly,\n money will be transfered to your wallet.</p>
              </>`
          }
          ${
            !winner &&
            `
            <>
            <p>Sorry no bidder are interested currently</p>
            <p>Try with new price or longer auction time.</p>
            </>
        `
          }
        `,
  };
};

export const auctionCompleteTemplateForBidder = (auction) => {
  const gem = auction.gemId;
  const merchant = auction.merchantId;

  const body = `
      <h2>Auction Completed: ${gem.name}</h2>
      <h3>GemId: ${gem._id}</h3>
      <p>Final Price: $${auction.currentPrice || gem.price}</p>
      <p>Gem Type: ${gem.type}</p>
      <img src="${process.env.BASE_URL+'/'+gem.images[0]}" alt="${gem.name}" width="200">
    `;
  return {
    subject: `You won the auction for ${gem.name}!`,
    html: `
          ${body}
          <p>Please contact the merchant at ${merchant.email} to arrange payment and delivery.</p>
        `,
  };
};

export const outBidMailTemplate = (auction, newBid) => {
  const { gemId: gem, currentPrice } = auction;
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">You've Been Outbid on ${gem.name}</h2>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h3 style="margin-top: 0;">Auction Details</h3>
        <p><strong>Item:</strong> ${gem.name}</p>
        <p><strong>New Highest Bid:</strong> $${newBid.bidAmount.toFixed(2)}</p>
        <p><strong>Your Previous Bid:</strong> $${currentPrice.toFixed(2)}</p>
        <img src="${process.env.BASE_URL}/${gem.images[0]}" alt="${gem.name}" 
             style="max-width: 200px; height: auto; display: block; margin: 15px 0;" />
      </div>
      <div style="background-color: #fff8e1; padding: 20px; border-radius: 5px; margin-top: 20px;">
        <h3 style="margin-top: 0;">Want to Bid Again?</h3>
        <p>The auction is still active - you can place a new bid to regain the lead!</p>
        <a href="${process.env.CLIENT_URL}/auction-detail/${auction._id}" 
           style="display: inline-block; background-color: #ffc107; color: #2c3e50; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; 
                  font-weight: bold; margin: 10px 0;">
          Place New Bid
        </a>
        <p style="font-size: 0.9em; color: #6c757d;">
          Auction ends at: ${new Date(auction.endTime).toLocaleString()}
        </p>
      </div>
    </div>
  `;

  return {
    subject: `You've been outbid on ${gem.name}`,
    html: body
  };
};

export const sendPaymentLinkToWinnerTemplate = (auction, payment) => {
  const { gemId: gem, merchantId: merchant, currentPrice } = auction;
  const finalPrice = currentPrice || gem.price;

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Congratulations! You Won: ${gem.name}</h2>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h3 style="margin-top: 0;">Auction Details</h3>
        <p><strong>Gem ID:</strong> ${gem._id}</p>
        <p><strong>Final Price:</strong> $${finalPrice.toFixed(2)}</p>
        <p><strong>Gem Type:</strong> ${gem.type}</p>
        <img src="${process.env.BASE_URL+ '/'+gem.images[0]}" alt="${gem.name}" style="max-width: 200px; height: auto; display: block; margin: 15px 0;" />
      </div>
  `;

  return {
    subject: `You won the auction for ${gem.name}! - Payment Required`,
    html: `
      ${body}
      <div style="background-color: #e8f4fc; padding: 20px; border-radius: 5px; margin-top: 20px;">
        <h3 style="margin-top: 0;">Next Steps</h3>
        <p>Please complete your payment to secure your winning bid:</p>
        <a href="${payment.coinGatePaymentLink}" 
           style="display: inline-block; background-color: #28a745; color: white; 
                  padding: 10px 20px; text-decoration: none; border-radius: 5px; 
                  font-weight: bold; margin: 10px 0;">
          Pay Now
        </a>
        <p style="font-size: 0.9em; color: #6c757d;">
          Payment must be completed within 48 hours to avoid cancellation.
        </p>
      </div>
    </div>
    `,
  };
};


export const sendPaymentPaidNotificationTemplate = (payment) => {
  // Extract data from populated payment object
  const gem = payment.auction?.gemId;
  const formattedAmount = parseFloat(payment.amount).toFixed(8);
  const transactionDate = new Date(payment.transactionDate).toLocaleString();

  return {
    subject: `Payment Confirmed - ${gem?.name || 'Your Order'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
          Payment Confirmed
        </h2>
        
        ${gem ? `
          <div style="margin-bottom: 20px;">
            <p><strong>Item:</strong> ${gem.name}</p>
            ${gem.images?.[0] ? `
              <img src="${process.env.BASE_URL}/${gem.images[0]}" 
                   alt="${gem.name}" 
                   style="max-width: 200px; height: auto; display: block; margin: 10px 0; border-radius: 4px;" />
            ` : ''}
          </div>
        ` : ''}
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #28a745;">Transaction Details</h3>
          <p><strong>Amount:</strong> ${formattedAmount} ${payment.price_currency}</p>
          <p><strong>Date:</strong> ${transactionDate}</p>
          <p><strong>Status:</strong> <span style="color: #28a745;">Paid</span></p>
          ${payment.metadata?.coinGateId ? `<p><strong>Transaction ID:</strong> ${payment.metadata.coinGateId}</p>` : ''}
        </div>
        
        <div style="margin-top: 20px;">
          <p>Your payment was successfully processed. We'll notify you when your item ships.</p>
        </div>
        
        <div style="margin-top: 30px; font-size: 0.9em; color: #6c757d; border-top: 1px solid #eee; padding-top: 15px;">
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    `
  };
};

export const sendPaymentFailedNotificationTemplate = (payment) => {
  // Extract data from populated payment object
  const gem = payment.auction?.gemId;
  const formattedAmount = parseFloat(payment.amount).toFixed(8);
  const transactionDate = new Date(payment.transactionDate).toLocaleString();
  const statusText = payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1);

  return {
    subject: `Payment Issue - ${gem?.name || 'Your Order'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #dc3545; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
          Payment ${statusText}
        </h2>
        
        ${gem ? `
          <div style="margin-bottom: 20px;">
            <p><strong>Item:</strong> ${gem.name}</p>
            ${gem.images?.[0] ? `
              <img src="${process.env.BASE_URL}/${gem.images[0]}" 
                   alt="${gem.name}" 
                   style="max-width: 200px; height: auto; display: block; margin: 10px 0; border-radius: 4px;" />
            ` : ''}
          </div>
        ` : ''}
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #dc3545;">Transaction Details</h3>
          <p><strong>Amount:</strong> ${formattedAmount} ${payment.price_currency}</p>
          <p><strong>Date:</strong> ${transactionDate}</p>
          <p><strong>Status:</strong> <span style="color: #dc3545;">${statusText}</span></p>
          ${payment.metadata?.coinGateId ? `<p><strong>Transaction ID:</strong> ${payment.metadata.coinGateId}</p>` : ''}
        </div>
        
        <div style="margin-top: 20px;">
          <p>We encountered an issue with your payment.</p>
          ${payment.coinGatePaymentLink ? `
            <p>You can retry your payment using the link below:</p>
            <a href="${payment.coinGatePaymentLink}" 
               style="display: inline-block; background-color: #dc3545; color: white; 
                      padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
              Retry Payment
            </a>
          ` : `
            <p>You can retry payment on your dashboard.</p>
            <p>Please contact support to resolve this issue.</p>
          `}
        </div>
        
        <div style="margin-top: 30px; font-size: 0.9em; color: #6c757d; border-top: 1px solid #eee; padding-top: 15px;">
          <p>If you need assistance, please contact our support team.</p>
        </div>
      </div>
    `
  };
};

//Forgot password for users
export const forgotPasswordEmail = (user, token) => {
  return {
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #007bff; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
          Password Reset
        </h2>
        
        <div style="margin-bottom: 20px;">
          <p>Dear <strong>${user.fullName}</strong>,</p>
          <p>We received a request to reset your password.</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
          <a href="${process.env.BASE_URL}/api/auth/forgotPassword?token=${token}" 
             style="display: inline-block; background-color: #007bff; color: white; 
                    padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            Reset Password
          </a>
        </div>
        
        <div style="margin-top: 30px; font-size: 0.9em; color: #6c757d; border-top: 1px solid #eee; padding-top: 15px;">
          <p>If you didn't request this, please ignore this email.</p>
          <p>For any questions, contact our support team.</p>
        </div>
      </div>
    `,
    text: `Dear ${user.fullName},\n\nWe received a password reset request. Click this link (valid for 1 hour):\nhttp://localhost:8000/api/auth/forgotPassword?token=${token}\n\nIf you didn't request this, please ignore this email.`
  };
};

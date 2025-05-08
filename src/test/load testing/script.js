import { check } from 'k6';
import ws from 'k6/ws';
import { WebSocket } from 'k6/experimental/websockets';

export const options = {
  vus: 10, // Virtual users
  duration: '30s', // Test duration
};

export default function () {
  const url = new WebSocket('ws://localhost:3000'); // Change to your server URL
  const auctionId = 'test-auction-123';
  
  const res = ws.connect(url, function(socket) {
    // Connection opened
    socket.on('open', () => {
      console.log('connected');
      
      // Join auction room
      socket.send(JSON.stringify({
        type: 'joinAuction',
        auctionId: auctionId
      }));
      
      // Simulate periodic bidding
      setInterval(() => {
        const bidAmount = Math.floor(Math.random() * 100) + 1;
        socket.send(JSON.stringify({
          type: 'placeBid',
          auctionId: auctionId,
          amount: bidAmount
        }));
      }, 2000);
    });
    
    // Handle messages
    socket.on('message', (data) => {
      console.log('Message received:', data);
    });
    
    // Handle errors
    socket.on('error', (e) => {
      console.log('error:', e.error());
    });
    
    // Handle close
    socket.on('close', () => {
      console.log('disconnected');
    });
    
    // Close connection after 10 seconds
    setTimeout(() => {
      socket.close();
    }, 10000);
  });
  
  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
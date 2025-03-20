// Check for a default route handler in index.js or app.js
// This might be overriding your specific route

// Remove or update any conflicting route handlers like this:
app.get('/api/games', (req, res) => {
  res.json({ message: 'Games API' });
});

// Make sure this is removed or placed AFTER your specific routes 
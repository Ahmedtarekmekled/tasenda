import React, { useEffect, useState } from 'react';

// Update the gameTypeOptions array
const gameTypeOptions = [
  { value: 'question-guess', label: 'Question & Guess' },
  { value: 'tic-tac-toe', label: 'Tic Tac Toe' }
];

// Then in your form validation, update the maxPlayers logic
useEffect(() => {
  // Set max players based on game type
  if (formData.gameType === 'tic-tac-toe') {
    setFormData(prev => ({ ...prev, maxPlayers: 2 }));
  } else if (formData.gameType === 'question-guess') {
    setFormData(prev => ({ ...prev, maxPlayers: 4 }));
  }
}, [formData.gameType]); 
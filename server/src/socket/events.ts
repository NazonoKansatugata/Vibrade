// Socket.io Events Definition
// Shared between Client and Server to avoid string typos

export const ClientEvents = {
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  CONTROL_INPUT: 'controlInput',
  LAUNCH_BEY: 'launchBey',
  START_GAME: 'startGame',
  DISCONNECT: 'disconnect'
} as const;

export const ServerEvents = {
  ROOM_CREATED: 'roomCreated',
  PLAYER_LIST: 'playerList',
  PLAYER_INPUT: 'playerInput',
  GAME_STATE: 'gameState',
  COLLISION: 'collision',
  GAME_START: 'gameStart',
  ERROR: 'error'
} as const;

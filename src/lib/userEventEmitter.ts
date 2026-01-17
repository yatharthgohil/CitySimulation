import { EventEmitter } from 'events';
import { UserProfile } from './userDatabase';

class UserEventEmitter extends EventEmitter {
  emitUserCreated(user: UserProfile) {
    this.emit('userCreated', user);
  }
}

export const userEventEmitter = new UserEventEmitter();


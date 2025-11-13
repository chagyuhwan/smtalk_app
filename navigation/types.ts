import { User } from '../types';

export type RootStackParamList = {
  PhoneAuth: undefined;
  MainTabs: undefined;
  Chat: {
    chatRoomId: string;
    partner: User;
  };
  ProfileSettings: undefined;
  Charge: undefined;
  BlockedUsers: undefined;
};

export type MainTabParamList = {
  StarTalk: undefined;
  Users: undefined;
  Messages: undefined;
  More: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}



import { User } from '../types';

export type RootStackParamList = {
  PhoneAuth: undefined;
  MainTabs: undefined;
  Chat: {
    chatRoomId: string;
    partner: User;
  };
  ProfileSettings: undefined;
  UserProfile: {
    user: User;
  };
  Charge: undefined;
  BlockedUsers: undefined;
  CustomerService: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  NotificationSettings: undefined;
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



interface IAppConfig {
  token: string;
  backgroundImage: string;
}

interface IClient {}

interface IAuthData {
  TokenType: string;
  AccessToken: string;
  User: IUser;
}

interface IUser {
  Id: string;
  FirstName: string;
  LastName: string;
  Type: string;
}

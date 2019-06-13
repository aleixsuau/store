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

interface IPromiseError {
  rejection: {
    error: {
      message: string
    };
    headers?: any;
    message: string;
    name: string;
    ok: boolean;
    status: number;
    statusText: string;
    url: string;
  };
  promise: any;
  zone: any;
  task: any;
}

interface ErrorWithContext {
  name: string;
  siteId: string;
  user: string;
  time: number;
  id: string;
  url: string;
  status: string;
  message: string;
  stack: any;
}

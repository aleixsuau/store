interface IUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  userStatus: number;
}
interface IAPIResponse {
  code: number;
  message: string;
  type: string;
}

interface IOption {
  label: string;
  value: any;
}


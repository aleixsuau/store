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

interface IItem {
  id: number;
  name: string;
  [key: string]: any;
}

interface IPet extends IItem {
  status: string;
  category: IItem;
  photoUrls: string[];
  tags: IItem[];
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


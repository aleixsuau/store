interface IStoreItem {
  id: number;
  [ket: string]: any;
}

interface IStoreStateModel {
  items: IStoreItem[];
}

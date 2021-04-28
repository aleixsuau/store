export class Add {
  static readonly type = '[Item] Add';

  constructor(public item: IStoreItem) {
  }
}

export class Query {
  static readonly type = '[Items] Query';

  constructor(public queryParams: string) {
  }
}

import { StoreService } from './../services/store/store.service';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import * as storeActions from './store.actions';
import { tap } from 'rxjs/operators';

import { Injectable } from '@angular/core';

@Injectable()
@State<IStoreStateModel>({
  name: 'items',
  defaults: {
    items: [],
    statuses: [
      {
        label: 'Available',
        value: 'available',
      },
      {
        label: 'Pending',
        value: 'pending',
      },
      {
        label: 'Sold',
        value: 'sold',
      }
    ],
  }
})
export class StoreState {
  constructor(
    private _storeService: StoreService,
  ) {}

  @Selector()
  static statuses$(state: IStoreStateModel) {
    return state.statuses;
  }

  @Selector()
  static items$(state: IStoreStateModel) {
    return state.items;
  }

  @Action(storeActions.Add)
  add({ getState, patchState }: StateContext<IStoreItem>, { item }: storeActions.Add) {
    return this._storeService
      .add(item)
      .pipe(
        tap((savedItem) => {
          const state = getState();

          patchState({
            ...state,
            items: [
              ...state.items,
              savedItem,
            ]
          });
        })
      );
  }

  @Action(storeActions.Query)
  query({ getState, patchState }: StateContext<IStoreItem>, { queryParams }: storeActions.Query) {
    return this._storeService
      .query(queryParams)
      .pipe(
        tap(items => {
          const state = getState();

          patchState({
            ...state,
            items,
          });
        })
      );
  }
}

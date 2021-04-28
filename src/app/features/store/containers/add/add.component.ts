import { fadeAnimationDefault } from './../../../../shared/animations/animations';
import { FormsService } from './../../../../core/services/forms/forms.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, NgForm } from '@angular/forms';
import { map, switchMap } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import * as storeActions from '../../ngxs-store/store.actions';


@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss'],
  animations: fadeAnimationDefault
})
export class AddComponent implements OnInit {
  form: FormGroup;
  formFields = [
    {
      key: 'name',
      placeholder: 'Name',
      type: 'text',
      validators: [Validators.required]
    },
    {
      key: 'status',
      placeholder: 'Status',
      type: 'select',
      validators: [Validators.required]
    },
    {
      key: 'photoUrls',
      placeholder: 'Image',
      type: 'file',
      validators: [Validators.required]
    },
  ];
  statuses = [
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
  ];

  @ViewChild('formDirective') private formDirective: NgForm;

  constructor(
    private _formbuilder: FormBuilder,
    private _formsService: FormsService,
    private _ngxsStore: Store,
  ) { }

  ngOnInit(): void {
    const formGroupConfig = this.formFields
      .reduce((formGroup, { key, validators }) => {
        formGroup = {
          ...formGroup,
          [key]: [null, validators],
        };

        return formGroup;
      }, {});

    this.form = this._formbuilder.group(formGroupConfig);
  }

  onSubmit(item: IItem) {
    this._formsService
      .getFilesDataUrls(item.photoUrls.files)
      .pipe(
        map(filesDataUrls => ({...item, photoUrls: filesDataUrls})),
        switchMap(itemToAdd => this._ngxsStore.dispatch(new storeActions.Add(itemToAdd))),
      )
      .subscribe(() => this.formDirective.resetForm());
  }
}

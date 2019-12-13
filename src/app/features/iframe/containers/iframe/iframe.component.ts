import { ConfigService } from 'src/app/core/config/service/config.service';
import { MomentService } from './../../../../core/services/moment/moment.service';
import { UserService } from './../../../../core/services/user/user.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { AuthService } from './../../../../core/auth/auth-service/auth.service';
import { SalesService } from './../../../retail/services/sales/sales.service';
import { ClientsService } from './../../../clients/services/clients/clients.service';
import { IframeService } from './../../services/iframe/iframe.service';
import { ActivatedRoute } from '@angular/router';
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { switchMap, debounceTime } from 'rxjs/operators';
import { MatStepper } from '@angular/material';
import { fromEvent, Subscription } from 'rxjs';
import { fadeAnimation } from '../../../../shared/animations/animations';
import { transition, trigger, useAnimation } from '@angular/animations';

/**
 * EXPLANATION
 * This widget allows two flows:
 * 1 - New IClient:
 *    1 - Select IContract
 *    2 - Fill 'Personal details' form group. When the IClient clicks on 'Next',
 *        a new IClient is created
 *        the IClient is disabled,
 *        and we go to 'Payment details' step
 *    3 - Fill the 'ClientCreditCard' formgroup. When the IClient clicks on 'Next',
 *        the IClient is updated with the new credit card and we go to the 'Purchase'
 *        step.
 *    4 - The client accept the terms and conditions and clicks on 'Purchase' and the
 *        purchase is done.
 *
 * 2 - Existent IClient:
 *    1 - Select IContract
 *    2 - Login Form, when the IClient clicks on 'Next',
 *        the 'Personal details' form group is filled
 *        if the IClient has ClientCreditCard, the 'ClientCreditCard' formgroup is filled
 *    3 - Fill the 'ClientCreditCard' formgroup if the IClient had not ClientCreditCard
 *        When the IClient clicks on 'Purchase Contract',
 *        the IClient is updated with the new credit card, if there is one, and then
 *        the purchase is processed.
 *    4 - Purchase Result step.
 */

@Component({
  selector: 'app-iframe',
  templateUrl: './iframe.component.html',
  styleUrls: ['./iframe.component.scss'],
  animations: [
    trigger('fade', [
      transition('void => *', [
        useAnimation(fadeAnimation, {
          delay: 0,
          params: { from: 0, to: 1, time: '500ms' },
        })
      ])
    ])
  ]
})
export class IframeComponent implements OnInit, OnDestroy {
  contracts: IContract[];
  selectableContracts: IContract[];
  iframeForm: FormGroup;
  personalDetailsFormGroup: FormGroup;
  years: string[] = [];
  months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  activeClient: IClient;
  requiredFields = ['FirstName', 'LastName', 'Email'];
  saleFinished: boolean;
  selectedTab = 0;
  purchaseButtonDisabled: boolean;
  showNoContractsMessage: boolean;
  config: IAppConfig;
  business_terms: string[];
  termToShow: string;
  scrollLeftButtonDisabled = false;
  scrollRightButtonDisabled = true;
  scrollSubscription: Subscription;
  lastScrollPosition: number;

  @ViewChild('stepper', {static: false}) stepper: MatStepper;
  @ViewChild('contractsBox', {static: true}) contractsBox: ElementRef<HTMLElement>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private formBuilder: FormBuilder,
    private iframeService: IframeService,
    private clientsService: ClientsService,
    private salesService: SalesService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private userService: UserService,
    private momentService: MomentService,
    private configService: ConfigService,
  ) { }

  ngOnInit() {
    this.contracts = this.activatedRoute.snapshot.data.contracts;
    this.config = this.configService.config;
    this.business_terms = [...Object.keys(this.config.customization.texts)];
    const currentYear = new Date().getFullYear();

    Array(30).fill(true).forEach((e, index) => {
      this.years = [...this.years, `${currentYear + index}`];
    });

    this.iframeForm = this.formBuilder.group({
      contract: [null, Validators.required],
      personalDetails: this.formBuilder.group({}),
      ClientCreditCard: this.formBuilder.group({
                                          CardNumber: [null, Validators.required],
                                          ExpMonth: [null, Validators.required],
                                          ExpYear: [null, Validators.required],
                                          CVV: [null, Validators.required],
                                        }),
      acceptedContractTerms: [null, Validators.requiredTrue],
      acceptedBusinessTerms: [null, Validators.requiredTrue],
    });
    this.personalDetailsFormGroup = this.iframeForm.get('personalDetails') as FormGroup;
    const activeUser = this.userService.getUser();
    // If a IClient already logeed in on this browser,
    // Show Login tab by default and filter the IContracts
    // to only show those available to him.
    // Only IClients have Email, IUser (admin users) don't.
    if (activeUser && activeUser['Email']) {
      this.selectedTab = 1;
    }

    this.filterSelectableContracts(this.contracts);

    this.iframeService
          .getRequiredFields()
          .subscribe((requiredFields: string[]) => {
            this.requiredFields = [...this.requiredFields, ...requiredFields];

            this.requiredFields
                  .filter(requiredField => !this.iframeForm.contains(requiredField))
                  .forEach(requiredField => {
                    const personalDetailsGroup = this.iframeForm.get('personalDetails') as FormGroup;
                    const validators = requiredField === 'Email' ? [ Validators.required, Validators.email ] : [ Validators.required ];

                    personalDetailsGroup.addControl(requiredField, this.formBuilder.control(null, validators));
                  });
          });

    this.scrollSubscription = fromEvent(this.contractsBox.nativeElement, 'scroll')
                                .subscribe(event => {
                                  const target = event.target as HTMLElement;
                                  const currentScrollPosition = target.scrollLeft;
                                  const scrollingRight = currentScrollPosition < this.lastScrollPosition;
                                  const scrollingLeft = currentScrollPosition > this.lastScrollPosition;
                                  const contractsBox = this.contractsBox.nativeElement;
                                  // box.scrollWidth === box.clientWidth + box.scrollLeft
                                  const maxScrollLeft = contractsBox.scrollWidth - contractsBox.clientWidth;
                                  this.lastScrollPosition = currentScrollPosition;

                                  if (scrollingLeft) {
                                    // Avoid enable button when scrollbar bounces (IOS)
                                    if (contractsBox.scrollLeft > 10) {
                                      this.scrollRightButtonDisabled = false;
                                    }

                                    if (contractsBox.scrollLeft >= maxScrollLeft) {
                                      this.scrollLeftButtonDisabled = true;
                                    }
                                  } else if (scrollingRight) {
                                    // Avoid enable button when scrollbar bounces (IOS)
                                    if ((maxScrollLeft - contractsBox.scrollLeft) > 10) {
                                      this.scrollLeftButtonDisabled = false;
                                    }

                                    if (contractsBox.scrollLeft <= 0) {
                                      this.scrollRightButtonDisabled = true;
                                    }
                                  }
                                });
  }

  ngOnDestroy() {
    this.scrollSubscription.unsubscribe();
  }

  getContractStart (contract: IContract) {
    let contractStart;
    // TEST FUNTIONALITY
    const today = this.momentService.moment().startOf('day');
    const first = today.date() === 1 ? today : today.clone().add(1, 'months').startOf('month');
    const last = today.date() === today.clone().endOf('month').date() ? today : today.clone().endOf('month');
    const fifteen = today.date() <= 15 ? today.clone().date(15) : today.clone().add(1, 'months').date(15);
    const sixteen = today.date() <= 16 ? today.clone().date(16) : today.clone().add(1, 'months').date(16);

    switch (contract.ClientsChargedOn) {
      case 'FirstOfTheMonth':
        contractStart = first;
        break;

      case 'FifteenthOfTheMonth':
        contractStart = fifteen;
        break;

      case 'LastDayOfTheMonth':
        contractStart = last;
        break;

      // TODO: Cover this case
      case 'FirstOrFifteenthOfTheMonth':
        contractStart = today.diff(first, 'days') < today.diff(fifteen, 'days') ?
                            first :
                            fifteen;
        break;

      case 'FirstOrSixteenthOfTheMonth':
        contractStart = today.diff(first, 'days') < today.diff(sixteen, 'days') ?
                            first :
                            sixteen;
        break;

      case 'FifteenthOrEndOfTheMonth':
        contractStart = today.diff(fifteen, 'days') < today.diff(last, 'days') ?
                            fifteen :
                            last;
        break;

      case 'SpecificDate':
        contractStart = this.momentService.moment(contract.ClientsChargedOnSpecificDate);
        break;

      case 'OnSaleDate':
        contractStart = today;
        break;

      default:
        contractStart = today;
    }

    return contractStart.format('MM/DD/YYYY');
  }

  sendResetPasswordEmail(userEmail: string, userFirstName: string, userLastName: string) {
    this.authService
            .sendResetPasswordEmail(userEmail, userFirstName, userLastName)
            .subscribe();
  }

  addClient(client: IClient, creditCard: IClientCreditCard) {
    const clientToSend = { ...client, ClientCreditCard: creditCard };

    this.clientsService
          .addClient(clientToSend)
          .pipe(
            switchMap(createdClient => {
              this.activeClient = createdClient;
              this.userService.setUser(this.activeClient);
              this.iframeForm.get('personalDetails').disable();
              this.iframeForm.get('ClientCreditCard').disable();
              this.iframeForm.get('ClientCreditCard').setValue({
                CardNumber: createdClient.ClientCreditCard.CardNumber,
                ExpMonth: createdClient.ClientCreditCard.ExpMonth,
                ExpYear: createdClient.ClientCreditCard.ExpYear,
                CVV: '***',
              });

              return this.authService
                            .sendResetPasswordEmail(this.activeClient.Email, this.activeClient.FirstName, this.activeClient.LastName);
            })
          )
          .subscribe(() => {
            this.notificationService.notify('User created. We have sent you an email to set your password');
            this.stepper.next();
          });
  }

  sellContract(contract: IContract, client: IClient, acceptedContractTerms: boolean, acceptedBusinessTerms: boolean) {
    this.salesService
          .sellContract(contract, this.activeClient, true, null, acceptedContractTerms, acceptedBusinessTerms)
          .pipe(debounceTime(1000))
          .subscribe(
            response => this.finishSale(),
            error => {
              this.notificationService.notify(error.error, 'X', { panelClass: 'error' });
              this.purchaseButtonDisabled = false;
            },
          );
  }

  finishSale() {
    this.saleFinished = true;
    this.stepper.next();
  }

  onLoggedIn(client: IClient) {
    this.activeClient = client;
    this.userService.setUser(this.activeClient);
    this.filterSelectableContracts(this.contracts, this.activeClient);
    this.fillClientFormFills(this.activeClient);

    this.stepper.next();
  }

  fillClientFormFills(activeClient: IClient) {
    this.requiredFields.forEach(requiredField => {
      this.iframeForm.get(`personalDetails.${requiredField}`).setValue(activeClient[requiredField] || null);
    });

    if (this.iframeForm.get('personalDetails').valid) {
      this.iframeForm.get('personalDetails').disable();
    }

    if (this.activeClient.ClientCreditCard) {
      this.iframeForm.get('ClientCreditCard').disable();
      this.iframeForm.get('ClientCreditCard').setValue({
        CardNumber: this.activeClient.ClientCreditCard.CardNumber,
        ExpMonth: this.activeClient.ClientCreditCard.ExpMonth,
        ExpYear: this.activeClient.ClientCreditCard.ExpYear,
        CVV: '***',
      });
    }
  }

  filterSelectableContracts(contracts: IContract[], client?: IClient) {
    if (client && client.Email) {
      this.clientsService
            .getClientContracts(client.Id)
            .subscribe(clientContracts => {
              const contractOnGoingStatuses = ['active', 'paused', 'payment_pending', 'activation_pending', 'paused_no_payment'];
              const activeClientContractsIds = clientContracts
                                                .filter(mbContract => contractOnGoingStatuses.includes(mbContract.status))
                                                .map(mbContract => mbContract.id);
              const selectedContract = this.iframeForm.get('contract').value;

              this.selectableContracts = contracts
                                          .filter(contract => contract.SoldOnline === true)
                                          .filter(contract => !activeClientContractsIds.includes(contract.Id));
              this.showNoContractsMessage = this.selectableContracts && !this.selectableContracts.length;

              if (selectedContract && activeClientContractsIds.includes(selectedContract.Id)) {
                this.notificationService.notify('You can not purchase the same contract 2 times, please select another contract.', 'X', { panelClass: 'error' });
                this.iframeForm.get('contract').setValue(null);
                this.stepper.previous();
                this.stepper.selectedIndex = 0;
              }
            });
    } else {
      this.selectableContracts = contracts.filter(contract => contract.SoldOnline === true);
    }

    this.showNoContractsMessage = this.selectableContracts && !this.selectableContracts.length;
  }

  scrollIt(direction: 'right' | 'left') {
    const contractsBox = this.contractsBox.nativeElement;
    if (direction === 'left') {
      contractsBox.scrollLeft += contractsBox.clientWidth;
    } else if (direction === 'right') {
      contractsBox.scrollLeft -= contractsBox.clientWidth;
    }
  }
}

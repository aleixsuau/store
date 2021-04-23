import { Directive, Input, NgZone, OnChanges, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appFocus]',
})
export class FocusDirective implements OnChanges {
  @Input() appFocus: boolean;

  constructor(
    private _renderer: Renderer2,
    private _ngZone: NgZone,
  ) { }

  ngOnChanges() {
    if (this.appFocus) {
      this._ngZone.runOutsideAngular(() => {
        Promise.resolve().then(() => this._renderer.selectRootElement('input').focus())
      });
    }
  }
}

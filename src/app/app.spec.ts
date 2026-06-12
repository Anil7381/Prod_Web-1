import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the storefront hero', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Shoes, shirts, pants');
  });

  it('should add a product to the cart and calculate total', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const product = app.products()[0];

    app.addToCart(product);

    expect(app.itemCount()).toBe(1);
    expect(app.subtotal()).toBe(product.price);
    expect(app.total()).toBe(product.price);
  });
});

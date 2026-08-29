if (!customElements.get('product-gallery')) {
  customElements.define('product-gallery', class ProductGallery extends HTMLElement {
    connectedCallback() {
      this.querySelectorAll('[data-gallery-open]').forEach((button) => {
        button.addEventListener('click', () => this.open(button.dataset.galleryOpen));
      });
      this.querySelectorAll('[data-gallery-close]').forEach((button) => {
        button.addEventListener('click', () => this.close(button.closest('.product-gallery__modal')));
      });
      this.querySelectorAll('.product-gallery__modal').forEach((modal) => {
        this.setupVariants(modal);
      });
      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.close(this.querySelector('.product-gallery__modal.is-visible'));
        }
      });
      document.addEventListener('click', (event) => {
        const modal = this.querySelector('.product-gallery__modal.is-visible');
        const dialog = modal?.querySelector('[role="dialog"]');
        if (modal && dialog && !dialog.contains(event.target)) this.close(modal);
      });
    }

    open(id) {
      const modal = this.querySelector(`#${id}`);
      if (!modal) return;
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add('is-visible'));
      modal.querySelector('[role="dialog"]').focus();
      document.body.classList.add('overflow-hidden');
    }

    close(modal) {
      if (!modal) return;
      modal.classList.remove('is-visible');
      modal.addEventListener('transitionend', () => { modal.hidden = true; }, { once: true });
      document.body.classList.remove('overflow-hidden');
    }

    setupVariants(modal) {
      const form = modal.querySelector('form');
      const variantInput = form?.querySelector('.product-variant-id');
      const variantsNode = form?.querySelector('[data-gallery-variants]');
      if (!form || !variantInput || !variantsNode) return;
      const variants = JSON.parse(variantsNode.textContent);
      const updateVariant = () => {
        const choices = [...form.querySelectorAll('[data-option-index]')].reduce((values, input) => {
          if ((input.type === 'radio' && input.checked) || input.type !== 'radio') values[input.dataset.optionIndex] = input.value;
          return values;
        }, []);
        const variant = variants.find((item) => item.options.every((option, index) => option === choices[index]));
        variantInput.value = variant?.id || '';
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = !variant?.available;
        submit.querySelector('span').textContent = variant && !variant.available ? 'Sold out' : 'Add to cart';
      };
      form.querySelectorAll('[data-option-index]').forEach((input) => input.addEventListener('change', updateVariant));
      updateVariant();
    }
  });
}
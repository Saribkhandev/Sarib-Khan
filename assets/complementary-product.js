(() => {
  const config = window.complementaryAutoCart || {};
  const TRIGGER_VALUES = {
    black: ['black', 'blk', 'charcoal black'],
    medium: ['medium', 'med', 'm', 'mid', 'size m', 'size medium'],
  };

  if (!config.complementaryProductId) {
    return;
  }

  const cartState = window.__complementaryAutoCartState || (window.__complementaryAutoCartState = { adding: false });

  const normalizeValues = (values = []) =>
    values
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean);

  const hasRequiredOptions = (item) => {
    if (!item) return false;

    const values = [
      ...(Array.isArray(item.options_with_values) ? item.options_with_values.map((entry) => entry && entry.value) : []),
      ...(Array.isArray(item.variant_options) ? item.variant_options : []),
      ...(item.option1 ? [item.option1] : []),
      ...(item.option2 ? [item.option2] : []),
      ...(item.option3 ? [item.option3] : []),
    ];

    const normalized = normalizeValues(values);
    const hasBlack = normalized.some((value) => TRIGGER_VALUES.black.includes(value));
    const hasMedium = normalized.some((value) => TRIGGER_VALUES.medium.includes(value));
    return hasBlack && hasMedium;
  };

  const isComplementaryProductInCart = (cart) => {
    if (!cart || !Array.isArray(cart.items)) return false;
    return cart.items.some((item) => Number(item.product_id) === Number(config.complementaryProductId));
  };

  const getComplementaryVariantId = async () => {
    if (config.complementaryVariantId) {
      return Number(config.complementaryVariantId);
    }

    if (!config.complementaryProductHandle) {
      return null;
    }

    const response = await fetch(`/products/${config.complementaryProductHandle}.js`, { credentials: 'same-origin' });
    if (!response.ok) return null;

    const product = await response.json();
    const variants = product && product.product ? product.product.variants : [];
    const variant = variants.find((item) => item.available) || variants[0];
    return variant ? Number(variant.id) : null;
  };

  const refreshCartDrawer = async () => {
    if (typeof publish === 'function') {
      publish(PUB_SUB_EVENTS.cartUpdate, { source: 'complementary-auto-cart' });
    }

    const cartUrl = (window.routes && window.routes.cart_url) || '/cart';
    const response = await fetch(`${cartUrl}?section_id=cart-drawer`);
    if (!response.ok) return;

    const html = new DOMParser().parseFromString(await response.text(), 'text/html');
    const selectors = ['cart-drawer-items', '.cart-drawer__footer'];

    selectors.forEach((selector) => {
      const current = document.querySelector(selector);
      const next = html.querySelector(selector);
      if (current && next) current.replaceWith(next);
    });
  };

  const addComplementaryProduct = async () => {
    try {
      const cartResponse = await fetch('/cart.js', { credentials: 'same-origin' });
      if (!cartResponse.ok) return;

      const cart = await cartResponse.json();
      const qualifies = Array.isArray(cart.items) && cart.items.some((item) => hasRequiredOptions(item));

      if (!qualifies || isComplementaryProductInCart(cart) || cartState.adding) return;

      cartState.adding = true;
      const variantId = await getComplementaryVariantId();

      if (!variantId) {
        cartState.adding = false;
        return;
      }

      const addResponse = await fetch('/cart/add.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(variantId), quantity: 1 }),
      });

      if (!addResponse.ok) {
        cartState.adding = false;
        return;
      }

      await refreshCartDrawer();
      cartState.adding = false;
    } catch (error) {
      cartState.adding = false;
    }
  };

  const runCheck = () => {
    if (document.readyState === 'loading') return;
    addComplementaryProduct();
  };

  document.addEventListener('DOMContentLoaded', runCheck, { once: true });
  if (typeof subscribe === 'function') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, runCheck);
  }
  document.addEventListener('cart:updated', runCheck);
  window.addEventListener('load', runCheck);
  runCheck();
})();

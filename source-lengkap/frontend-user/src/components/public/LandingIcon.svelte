<script>
  import {
    ArrowUpRight,
    Menu,
    ArrowRight,
    Wallet,
    ChartNoAxesCombined,
    Files,
    Handshake,
    UsersRound,
    MessagesSquare,
    Sprout,
    Store,
    MessageCircle,
    X,
    MapPin,
    Phone,
    Mail,
  } from '@lucide/svelte';
  let { name } = $props();
  const icons = {
    'arrow-up-right': ArrowUpRight,
    menu: Menu,
    'arrow-right': ArrowRight,
    wallet: Wallet,
    'chart-no-axes-combined': ChartNoAxesCombined,
    files: Files,
    handshake: Handshake,
    'users-round': UsersRound,
    'messages-square': MessagesSquare,
    sprout: Sprout,
    store: Store,
    'message-circle': MessageCircle,
    x: X,
    'map-pin': MapPin,
    phone: Phone,
    mail: Mail,
  };
  let Icon = $derived(icons[name]);
</script>

<Icon width={16} height={16} aria-hidden="true" />

<script>
  let { title, description, action = '' } = $props();
</script>

<div class="page-heading">
  <div>
    <h1>{title}</h1>
    <p class="subtext">{description}</p>
  </div>
  {@html action}
</div>

<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  import { attributeProps } from '../../../../../shared/runtime/view.js';
  export {
    IconView,
    BadgeView,
    NavLinkView,
    DemoStripView,
    Field2View,
    FieldView,
    SelectField2View,
    SelectFieldView,
    Review2View,
    ReviewView,
    HeadingView,
    StatView,
    ActivityView,
    Tabs2View,
    TabsView,
  };
</script>

{#snippet IconView({ content })}
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d={content}></path>
  </svg>
{/snippet}

{#snippet BadgeView({ statusColor, text })}
  <span class={'badge ' + statusColor}><Content value={text} /></span>
{/snippet}

{#snippet NavLinkView({ route, extra, icoContent, label })}
  <a href={'#' + route} {...attributeProps(extra)}
    ><Content value={icoContent} /><Content value={label} /></a
  >
{/snippet}

{#snippet DemoStripView({ icon })}
  <div class="prototype-strip">
    <Content value={icon} /><strong>Pratinjau konsep</strong><span
      >Pendaftaran, pengajuan, dan akad tersimpan dalam ruang pribadi Anda</span
    >
  </div>
{/snippet}

{#snippet Field2View()}
  <span aria-hidden="true">*</span>
{/snippet}

{#snippet FieldView({
  label,
  requiredContent,
  fieldName,
  type,
  fieldValue,
  requiredContent2,
  readonlyContent,
  placeholderContent,
  minContent,
  maxContent,
  patternContent,
  maxlengthContent,
})}
  <label class="form-field"
    ><span><Content value={label} /><Content value={requiredContent} /></span><input
      name={fieldName}
      {type}
      value={fieldValue}
      {...attributeProps(requiredContent2)}
      {...attributeProps(readonlyContent)}
      {...attributeProps(placeholderContent)}
      {...attributeProps(minContent)}
      {...attributeProps(maxContent)}
      {...attributeProps(patternContent)}
      {...attributeProps(maxlengthContent)}
      autocomplete="off"
    /></label
  >
{/snippet}

{#snippet SelectField2View({ x, xContent, x2 })}
  <option value={x} {...attributeProps(xContent)}><Content value={x2} /></option>
{/snippet}

{#snippet SelectFieldView({ label, requiredContent, fieldName, requiredContent2, itemsRows })}
  <label class="form-field"
    ><span><Content value={label} /><Content value={requiredContent} /></span><select
      name={fieldName}
      {...attributeProps(requiredContent2)}
    >
      <Content value={itemsRows} />
    </select></label
  >
{/snippet}

{#snippet Review2View({ a, b })}
  <div>
    <dt><Content value={a} /></dt>
    <dd><Content value={b} /></dd>
  </div>
{/snippet}

{#snippet ReviewView({ join })}
  <dl class="review-list">
    <Content value={join} />
  </dl>
{/snippet}

{#snippet HeadingView({ title, description, action })}
  <div class="page-heading">
    <div>
      <h1><Content value={title} /></h1>
      <p class="subtext"><Content value={description} /></p>
    </div>
    <Content value={action} />
  </div>
{/snippet}

{#snippet StatView({ label, icon, fieldValue, note, route })}
  <div class="stat">
    <div class="stat-top">
      <Content value={label} /><span class="stat-icon"><Content value={icon} /></span>
    </div>
    <div class="stat-value"><Content value={fieldValue} /></div>
    <div class="stat-bottom">
      <span><Content value={note} /></span><a href={'#' + route}>Lihat rincian ↗</a>
    </div>
  </div>
{/snippet}

{#snippet ActivityView({ icon, title, date, fieldValue, status })}
  <li class="activity-item">
    <span class="activity-symbol"><Content value={icon} /></span>
    <div class="activity-info">
      <strong><Content value={title} /></strong><small><Content value={date} /></small>
    </div>
    <div class="activity-value">
      <Content value={fieldValue} /><small><Content value={status} /></small>
    </div>
  </li>
{/snippet}

{#snippet Tabs2View({ current, fieldName, item, itemValue })}
  <button type="button" aria-pressed={current} data-tab={fieldName} data-value={item}
    ><Content value={itemValue} /></button
  >
{/snippet}

{#snippet TabsView({ fieldName, itemsRows })}
  <div class="tabs" role="group" aria-label={'Filter ' + fieldName}>
    <Content value={itemsRows} />
  </div>
{/snippet}

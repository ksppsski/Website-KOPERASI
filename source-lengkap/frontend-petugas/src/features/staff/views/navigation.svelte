<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  import { attributeProps } from '../../../../../shared/runtime/view.js';
  export { Picker2View, PickerView, Picker3View, RolePickerView };
</script>

{#snippet Picker2View({ r, activeRoleContent, rValue })}
  <option value={r} {...attributeProps(activeRoleContent)}>
    <Content value={rValue} />
  </option>
{/snippet}

{#snippet PickerView({ rolesRows })}
  <label class="staff-role-picker"
    ><span>Buka portal</span><select id="staff-role" aria-label="Buka portal">
      <Content value={rolesRows} />
    </select></label
  >
{/snippet}

{#snippet Picker3View({ roleName })}
  <p class="staff-label"><Content value={roleName} /></p>
{/snippet}

{#snippet RolePickerView()}
  <a class="staff-label" href="/avalist.html">Portal Avalist ↗</a>
{/snippet}

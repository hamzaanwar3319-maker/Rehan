const $ = id => document.getElementById(id);
let listings = [];
async function refresh() {
  listings = await window.marketplaceApp.loadListings();
  $('count').textContent = listings.length;
  $('list').innerHTML = listings.length ? listings.map(x => `<div class="item"><b>${escapeHtml(x.title)}</b> — ${escapeHtml(String(x.price || ''))}<br><small>${escapeHtml(x.location || '')}</small><p>${escapeHtml(x.description || '')}</p></div>`).join('') : '<p>No drafts saved yet.</p>';
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
$('fb').addEventListener('click', async () => { await window.marketplaceApp.openFacebook(); $('status').textContent = 'Temporary Facebook window opened. Closing it clears the session; sign in again next time.'; });
$('save').addEventListener('click', async () => {
  const title = $('title').value.trim();
  if (!title) { $('status').textContent = 'Please enter a title.'; return; }
  listings.unshift({title, price:$('price').value, location:$('location').value.trim(), description:$('description').value.trim(), createdAt:new Date().toISOString()});
  await window.marketplaceApp.saveListings(listings);
  $('title').value=''; $('price').value=''; $('location').value=''; $('description').value='';
  $('status').textContent='Draft saved locally.'; await refresh();
});
refresh();
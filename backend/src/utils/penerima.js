// Helper penerima email: dukungan multi PIC HC & multi User/Atasan per request.
// HC utama tersimpan di kolom pic_hc/email_pic_hc; HC tambahan di JSONB hc_tambahan.
// User utama di user_atasan/email_user; tambahan di JSONB user_tambahan.

const getSemuaHC = (request) => {
  const list = [];
  if (request.email_pic_hc) list.push({ nama: request.pic_hc, email: request.email_pic_hc });
  for (const h of (request.hc_tambahan || [])) {
    if (h && h.email) list.push({ nama: h.nama || 'PIC HC', email: h.email });
  }
  return list;
};

const getSemuaUser = (request) => {
  const list = [];
  if (request.email_user) list.push({ nama: request.user_atasan, email: request.email_user });
  for (const u of (request.user_tambahan || [])) {
    if (u && u.email) list.push({ nama: u.nama || 'User/Atasan', email: u.email });
  }
  return list;
};

module.exports = { getSemuaHC, getSemuaUser };

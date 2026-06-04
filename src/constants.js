export const STATUSES = ['입금 대기', '결제 완료', '디자인', '디자인 컨펌', '이식', '이식 컨펌', '완료']

export const STATUS_META = {
  '입금 대기': { className: 'status waiting', short: '입금' },
  '결제 완료': { className: 'status paid', short: '결제' },
  디자인: { className: 'status design', short: '디자인' },
  '디자인 컨펌': { className: 'status designConfirm', short: '컨펌' },
  이식: { className: 'status implement', short: '이식' },
  '이식 컨펌': { className: 'status implementConfirm', short: '검수' },
  완료: { className: 'status done', short: '완료' }
}

export const EMPTY_TASK = {
  client: '',
  option_name: '',
  extra_options: '',
  status: '입금 대기',
  start_date: '',
  due_date: '',
  price: '',
  designer_fee: '',
  designer_paid: false,
  notes: '',
  material_url: ''
}

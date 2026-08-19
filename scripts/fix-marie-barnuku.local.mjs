import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.BAR_PASSWORD_MARIE

if (!url || !serviceRole || !password) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et BAR_PASSWORD_MARIE sont requis dans .env.local'
  )
}

const admin = createClient(url, serviceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

const email = 'ntsaimarie@gmail.com'

const { data: listData, error: listError } =
  await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

if (listError) {
  throw listError
}

const marie = listData.users.find(
  (user) =>
    user.email?.toLowerCase() ===
    email.toLowerCase()
)

if (!marie) {
  throw new Error(
    `Compte Marie introuvable : ${email}`
  )
}

console.log('AVANT :')
console.log({
  id: marie.id,
  email: marie.email,
  app_metadata: marie.app_metadata,
  user_metadata: marie.user_metadata,
})

const { data, error } =
  await admin.auth.admin.updateUserById(
    marie.id,
    {
      password,
      email_confirm: true,

      app_metadata: {
        ...(marie.app_metadata || {}),
        employee_id: 'marie',
        employee_name: 'MARIE',
        bar_role: 'staff',
        bar_access: 'bar_team',
      },

      user_metadata: {
        ...(marie.user_metadata || {}),
        full_name: 'MARIE',
        employee_id: 'marie',
        department: 'Bar',
        role: 'Barmaid',
      },
    }
  )

if (error) {
  throw error
}

console.log('')
console.log('APRÈS :')
console.log({
  id: data.user.id,
  email: data.user.email,
  app_metadata: data.user.app_metadata,
  user_metadata: data.user.user_metadata,
})

console.log('')
console.log('MARIE CORRIGÉE')
console.log('employee_id = marie')
console.log('bar_role = staff')
console.log('bar_access = bar_team')
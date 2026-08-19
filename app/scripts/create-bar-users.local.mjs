import { createClient } from '@supabase/supabase-js'

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const serviceRole =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRole) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.'
  )
}

const admin = createClient(
  url,
  serviceRole,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const users = [
  {
    employee_id: 'emma',
    name: 'EMMA',
    email: 'emma.chadebech@outlook.fr',
    password: process.env.BAR_PASSWORD_EMMA,
    bar_role: 'assistant_manager',
    access: 'all',
  },
  {
    employee_id: 'jon',
    name: 'JON',
    email: 'jonathan.drouillon@gmail.com',
    password: process.env.BAR_PASSWORD_JON,
    bar_role: 'manager_admin',
    access: 'all',
  },
  {
    employee_id: 'marie',
    name: 'MARIE',
    email: 'ntsaimarie@gmail.com',
    password: process.env.BAR_PASSWORD_MARIE,
    bar_role: 'staff',
    access: 'planning_staff',
  },
  {
    employee_id: 'lola',
    name: 'LOLA',
    email: 'lolafabre73@gmail.com',
    password: process.env.BAR_PASSWORD_LOLA,
    bar_role: 'staff',
    access: 'planning_staff',
  },
  {
    employee_id: 'jeremy',
    name: 'JEREMY',
    email: 'antoinejeremy@live.fr',
    password: process.env.BAR_PASSWORD_JEREMY,
    bar_role: 'staff',
    access: 'planning_staff',
  },
  {
    employee_id: 'brandon',
    name: 'BRANDON',
    email: 'barlabtahiti@gmail.com',
    password: process.env.BAR_PASSWORD_BRANDON,
    bar_role: 'staff',
    access: 'planning_staff',
  },
]

for (const user of users) {
  if (!user.password) {
    throw new Error(
      `Mot de passe manquant pour ${user.name}.`
    )
  }
}

const {
  data: listData,
  error: listError,
} = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
})

if (listError) {
  throw listError
}

for (const item of users) {
  const existing =
    listData.users.find(
      user =>
        user.email?.toLowerCase() ===
        item.email.toLowerCase()
    )

  const metadata = {
    employee_id: item.employee_id,
    employee_name: item.name,
    bar_role: item.bar_role,
    bar_access: item.access,
  }

  if (existing) {
    const { error } =
      await admin.auth.admin.updateUserById(
        existing.id,
        {
          password: item.password,
          email_confirm: true,
          app_metadata: metadata,
        }
      )

    if (error) {
      console.error(
        `ERREUR ${item.name}:`,
        error.message
      )
      continue
    }

    console.log(
      `MIS À JOUR : ${item.name} (${item.email})`
    )

    continue
  }

  const { error } =
    await admin.auth.admin.createUser({
      email: item.email,
      password: item.password,
      email_confirm: true,
      app_metadata: metadata,
    })

  if (error) {
    console.error(
      `ERREUR ${item.name}:`,
      error.message
    )
    continue
  }

  console.log(
    `CRÉÉ : ${item.name} (${item.email})`
  )
}
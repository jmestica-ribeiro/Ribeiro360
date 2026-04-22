import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, getAdminClient, requireAdminRole } from '../_shared/auth.ts';

serve(async (req: Request) => {
  // Manejo de preflight CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // 1. Verificar usuario autenticado
    const user = await getAuthenticatedUser(req);

    // 2. Cliente privilegiado (service_role — nunca sale del servidor)
    const adminClient = getAdminClient();

    // 3. Verificar que sea admin o superadmin
    const callerProfile = await requireAdminRole(adminClient, user.id);
    const isSuperAdmin = callerProfile.role === 'superadmin';

    const { action, payload } = await req.json();

    // --- Listar usuarios (admin + superadmin) ---
    if (action === 'list_users') {
      const { data, error } = await adminClient
        .from('profiles')
        .select('id, full_name, email, role, admin_tabs')
        .not('full_name', 'is', null)
        .order('full_name');

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Obtener valores de perfil para filtros (admin + superadmin) ---
    if (action === 'get_profile_values') {
      const { data, error } = await adminClient
        .from('profiles')
        .select('job_title, department, office_location')
        .not('full_name', 'is', null);

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Actualizar rol/tabs (solo superadmin) ---
    if (action === 'update_role') {
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: 'Solo superadmin puede modificar roles' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { userId, newRole, adminTabs } = payload ?? {};
      if (!userId || !newRole) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros: userId, newRole' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await adminClient.rpc('admin_update_user_role', {
        target_user_id: userId,
        new_role: newRole,
        new_admin_tabs: adminTabs ?? null,
      });

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Eliminar usuario (solo superadmin) ---
    if (action === 'delete_user') {
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: 'Solo superadmin puede eliminar usuarios' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { userId } = payload ?? {};
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Falta parámetro: userId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Impedir auto-eliminación
      if (userId === user.id) {
        return new Response(JSON.stringify({ error: 'No podés eliminarte a vos mismo' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Eliminar perfil primero, luego el usuario de auth
      await adminClient.from('profiles').delete().eq('id', userId);
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Acción desconocida: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';

    if (message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (message === 'FORBIDDEN') {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.error('[admin-users]', message);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

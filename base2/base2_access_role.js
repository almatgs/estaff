function OnBeforeSave()
{
	if ( base1_config.log_ext_security_events && ! base1_config.use_security_admin_role )
	{
		lib_access.OnAccessRoleSave( this );
	}
}


function OnDelete()
{
	if ( base1_config.log_ext_security_events && ! base1_config.use_security_admin_role )
	{
		lib_access.OnAccessRoleDelete( this );
	}
}



function start_agent_manager()
{
	if ( System.IsWebClient )
		return;

	if ( IsDirectory( FilePath( AppDirectoryPath(), 'no_agents' ) ) )
		return;

	if ( StrContains( AppConfig.GetOptProperty( 'HOME', '' ), 'stp_view_main.xml' ) )
		return;

	//if ( ! UseLds )
		//return;

	//EnableLog( 'agents', true );

	thread = new Thread;
	thread.EvalCode( 'lib_agent.agent_manager_thread_proc()' );
}


function agent_manager_thread_proc()
{
	while ( true )
	{
		process_agents();
		Sleep( 2000 );
	}
}


function process_agents()
{
	for ( agent in lib_voc.get_sorted_voc( agents ) )
	{
		if ( should_launch_agent( agent ) )
			launch_agent( agent );
	}
}


function should_launch_agent( agent )
{
	if ( ! agent.is_my_side() )
		return false;

	if ( is_agent_running( agent.id ) )
		return false;

	if ( check_agent_explicit_run( agent.id ) )
		return true;

	if ( agent.schedule.use_term )
	{
		if ( agent.schedule.term.length == null || agent.schedule.term.length == 0 )
			return false;

		lastRunDate = agent.get_last_run_end_date();
		if ( lastRunDate != null )
		{
			if ( agent.schedule.term.unit_id == 'd' && Hour( CurDate ) >= 6 )
				return false;

			if ( lib_base.get_term_date_offset( lastRunDate, agent.schedule.term ) <= CurDate )
			{
				return true;
			}

			return false;
		}

		return true;
	}
	else
	{
		lastRunDate = agent.get_last_run_end_date();
		if ( lastRunDate != null && DateDiff( CurDate, lastRunDate ) <= 60 )
			return false;

		for ( timeEntry in agent.schedule.time_entries )
		{
			if ( timeEntry.hour == null || timeEntry.minute == null )
				continue;

			entryDate = DateNewTime( CurDate, timeEntry.hour, timeEntry.minute );
			if ( CurDate > entryDate && DateDiff( CurDate, entryDate ) < 60 )
				return true;
		}

		return false;
	}
}


function launch_agent( agent )
{
	thread = new Thread;
	thread.Param.agent = agent;
	register_running_agent( thread );

	thread.EvalCode( 'lib_agent.agent_thread_proc( ActiveThread )' );
}


function agent_thread_proc( thread )
{
	run_agent_core( thread.Param.agent, false );
	clean_up_running_agent( thread );
}


function run_agent_core( agent, isManual )
{
	LogEvent( 'agents', 'Agent started: ' + agent.name );

	if ( agent.scenario_object_type_id == 'import_scenario' )
	{
		code = 'lib_import.run_import_scenario( GetForeignElem( import_scenarios, \'' + agent.scenario_id + '\' ) )';
	}
	else if ( agent.scenario_object_type_id == 'export_scenario' )
	{
		code = 'lib_export.run_export_scenario( GetForeignElem( export_scenarios, \'' + agent.scenario_id + '\' ) )';
	}
	else if ( agent.scenario_object_type_id.HasValue )
	{
		throw 'Unable to get agent code';
	}
	else if ( agent.code == '' )
	{
		throw 'Empty agent code';
	}
	else
	{
		code = agent.code;
	}

	error = '';
	startDate = CurDate;

	try
	{
		eval( code );
	}
	catch ( e )
	{
		//alert( e );
		error = e;
	}

	if ( error == '' )
	{
		LogEvent( 'agents', 'Agent finished: ' + agent.name );
	}
	else
	{
		LogEvent( 'agents', 'Agent failed: ' + agent.name + ' - ' + UnifySpaces( ExtractUserError( error ) ) );

		if ( ! IsCancelError( error ) )
		{
			errDesc = StrReplace( UiText.errors.agent_xxx_failed, '%s', agent.name ) + '.\r\n' + error;
			if ( LdsIsClient )
				lib_base.show_error_message( ActiveScreen, errDesc );
			else
				LogEvent( 'errors', errDesc );
		}
	}

	if ( UseLds )
	{
		set_agent_stat( agent.id, startDate, CurDate, UnifySpaces( ExtractUserError( error ) ) );
	}
	else
	{
		agentDoc = OpenDoc( agent.ObjectUrl );
		agentDoc.TopElem.last_run_start_date = startDate;
		agentDoc.TopElem.last_run_date = CurDate;
		agentDoc.TopElem.last_error = UnifySpaces( ExtractUserError( error ) );
		agentDoc.Save();
	}
}


function set_agent_stat( agentID, lastRunStartDate, lastRunEndDate, lastRunErrorStr )
{
	return EvalCs( 'lib_agent.set_agent_stat_core( agentID, lastRunStartDate, lastRunEndDate, lastRunErrorStr )' );
}


function set_agent_stat_core( agentID, lastRunStartDate, lastRunEndDate, lastRunErrorStr )
{
	stat = agent_local_data.agent_stats.ObtainChildByKey( agentID );
	stat.last_run_start_date = lastRunStartDate;
	stat.last_run_end_date = lastRunEndDate;
	stat.last_run_error_str = lastRunErrorStr;
}


function is_agent_running( agentID )
{
	if ( UseLds && ! GetForeignElem( agents, agentID ).run_on_client )
		return is_server_agent_running( agentID );

	return EvalCs( 'running_agent_exists_core( agentID )' );
}


function running_agent_exists_core( agentID )
{
	return ( ArrayOptFind( running_agents, 'This.agent_id == agentID && This.thread_ref.Object.IsRunning' ) != undefined );
}


function is_server_agent_running( agentID )
{
	if ( EvalCs( 'GetCurTicks() - lib_agent.server_running_agents_last_load_ticks' ) > 10 )
	{
		ids = get_server_running_agents_ids();
		EvalCs( 'lib_agent.update_server_running_agents( ' + ids + ' )' );
	}

	return EvalCs( 'lib_agent.server_running_agents.GetOptChildByKey( agentID ) != undefined' );
}


function update_server_running_agents( idsArray )
{
	server_running_agents.Clear();

	for ( agentID in idsArray )
		server_running_agents.AddChild().agent_id = agentID;

	server_running_agents_last_load_ticks = GetCurTicks();
}


function register_running_agent( thread )
{
	return EvalCs( 'register_running_agent_core( thread )' );
}


function register_running_agent_core( thread )
{
	runningAgent = lib_agent.running_agents.AddChild();
	runningAgent.agent_id = thread.Param.agent.id;
	runningAgent.thread_ref = thread;
}


function clean_up_running_agent( thread )
{
	return EvalCs( 'clean_up_running_agent_core( thread )' );
}


function clean_up_running_agent_core( thread )
{
	runningAgent = lib_agent.running_agents.GetOptChildByKey( thread.Param.agent.id );
	if ( runningAgent != undefined )
		runningAgent.Delete();
}


function get_agent_stat_field( agent, fieldID )
{
	if ( UseLds && agent.run_on_client )
		return EvalCs( 'get_agent_stat_field_core( agent.id, fieldID )' );

	switch ( fieldID )
	{
		case 'last_run_end_date':
			return agent.last_run_date;

		case 'last_run_error_str':
			return agent.last_error;

		default:
			return agent.Child( fieldID );
	}
}


function get_agent_stat_field_core( agentID, fieldID )
{
	stat = agent_local_data.agent_stats.GetOptChildByKey( agentID );
	if ( stat == undefined )
	{
		return null;
	}

	return stat.Child( fieldID ).Value;
}


function handle_launch_agent( agentID, options )
{
	agent = GetForeignElem( agents, agentID );
	if ( ! agent.run_on_client && ! lib_user.active_user_access.allow_all )
		throw UiError( UiText.errors.permission_denied );

	if ( options == undefined )
		options = new Object;

	runSync = options.GetOptProperty( 'RunSync', agent.run_sync_manually );
	
	if ( runSync )
	{
		run_agent_core( agent );
		return;
	}

	runner = new MethodRunner( lib_agent, 'kick_agent' );
	runner.SetArguments( RValue( agentID ) );
	runner.RunOnServer = !agent.run_on_client;
	runner.Run();

	Sleep( 500 );
	
	if ( UseLds && !agent.run_on_client )
		lib_base.show_info_message( ActiveScreen, UiText.messages.agent_launched_on_server );
	else
		lib_base.show_info_message( ActiveScreen, UiText.messages.agent_launched );
}


function handle_run_agent_sync( agentID )
{
	handle_launch_agent( agentID, {RunSync:true} );
}


function kick_agent( agentID )
{
	if ( System.IsWebClient )
		return;
	
	EvalCs( 'lib_agent.kick_agent_core( ' + CodeLiteral( agentID ) + ' )' );
}


function kick_agent_core( agentID )
{
	stat = agent_requests.ObtainChildByKey( agentID );
	stat.explicit_run_ticks = GetCurTicks() + 500;
}


function check_agent_explicit_run( agentID )
{
	EvalCs( 'lib_agent.check_agent_explicit_run_core( ' + CodeLiteral( agentID ) + ' )' );
}


function check_agent_explicit_run_core( agentID )
{
	stat = agent_requests.GetOptChildByKey( agentID );
	if ( stat == undefined )
		return false;

	if ( ! stat.explicit_run_ticks.HasValue || stat.explicit_run_ticks > GetCurTicks() )
		return false;

	stat.explicit_run_ticks.Clear();
	return true;
}


function get_server_running_agents_ids()
{
	return EvalCs( 'lib_agent.get_server_running_agents_ids_core()' );
}


function get_server_running_agents_ids_core()
{
	return '[' + ArrayMerge( ArraySelect( lib_agent.running_agents, 'thread_ref.Object.IsRunning' ), 'CodeLiteral( agent_id )', ',' ) + ']';
}


function EnsureAgentHasSchedule( agentID, defaultInterval )
{
	agent = GetOptForeignElem( agents, agentID );
	if ( agent == undefined )
		throw UiError( 'Required agent not found: ' + agentID );

	needChange = false;
	if ( ! agent.is_active )
		needChange = true;

	if ( ! agent.use_schedule )
		needChange = true;

	if ( needChange )
		CallServerMethod( 'lib_agent', 'EnsureAgentHasScheduleCore', [agentID, defaultInterval] );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function EnsureAgentHasScheduleCore( agentID, defaultInterval )
{
	agentDoc = DefaultDb.OpenObjectDoc( 'agent', agentID );
	agent = agentDoc.TopElem;

	agent.schedule.use_term = true;
	agent.schedule.term.unit_id = defaultInterval.unit_id;
	agent.schedule.term.length = defaultInterval.length;
	agent.was_customized = true;
	
	agentDoc.WriteDocInfo = false;
	agentDoc.Save();
}

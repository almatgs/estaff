function OnCreate()
{
	user_id = LdsCurUserID;
	group_id = lib_user.active_user_info.main_group_id;

	type_id = Name;
	poll_result.spec_id = type.poll_spec_id;
}


function sync_participant_poll_results()
{
	for ( participant in participants )
		participant_poll_results.ObtainChildByKey( participant.person_id );
}


function update_sum_results()
{
	if ( ! poll_result.spec_id.HasValue )
		return;

	if ( participant_poll_results.ChildNum == 0 )
		return;

	spec = poll_result.spec_id.ForeignElem;

	for ( question in spec.questions )
	{
		totalQuestionAnswer = poll_result.question_answers.ObtainChildByKey( question.id );
		sum = 0;

		for ( participantResult in participant_poll_results )
		{
			questionAnswer = participantResult.question_answers.GetOptChildByKey( question.id );
			if ( questionAnswer == undefined )
				continue;

			if ( question.expr.HasValue )
			{
				if ( questionAnswer.score.HasValue )
					sum += questionAnswer.score;
				
				continue;
			}

			if ( ! questionAnswer.answer_id.HasValue )
				continue;

			answerID = ArrayFirstElem( questionAnswer.answer_id );
			if ( answerID == null )
			{
				questionAnswer.answer_id.Clear();
				continue;
			}

			sum += answerID;
		}

		if ( question.expr.HasValue )
		{
			//totalQuestionAnswer.score = sum / participant_poll_results.ChildNum;
			totalQuestionAnswer.score = sum / participants.ChildNum;
		}
		else
		{
			totalQuestionAnswer.answer_id.Clear();
			totalQuestionAnswer.answer_id.ObtainByValue( sum / participant_poll_results.ChildNum );
		}
	}
	
	for ( participantResult in participant_poll_results )
		participantResult.update_stat();

	poll_result.update_stat();

	average_score = ArraySum( participant_poll_results, 'average_score' ) / participant_poll_results.ChildNum;
}



function update_poll_occurrence()
{
	if ( AppModuleUsed( 'module_rgs' ) && type_id == 'rr_poll_co' )
		return;

	if ( occurrence_id != '' )
		return;

	if ( participants.ChildNum == 0 )
		return;

	if ( ArrayOptFind( participant_poll_results, '! completion_id.HasValue' ) == undefined )
		occurrence_id = 'succeeded';
}

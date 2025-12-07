import metrics_agent

def test_get_current_cpu_usage():
    """Test that CPU usage is a number between 0 and 100."""
    usage = metrics_agent.get_current_cpu_usage()
    assert isinstance(usage, (int, float))
    assert 0 <= usage <= 100

def test_get_current_memory_usage():
    """Test that memory usage dict contains expected keys."""
    mem = metrics_agent.get_current_memory_usage()
    assert 'total' in mem and 'used' in mem and 'percent' in mem